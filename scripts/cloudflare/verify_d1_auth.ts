/** Full private D1 auth flow proof, fake identity only. No email delivered. */
import assert from 'node:assert/strict';
import { createHmac, createHash, randomBytes } from 'node:crypto';
const endpoint=process.env.D1_STAGING_HTTP_URL;
const secret=process.env.D1_STAGING_BRIDGE_SECRET;
if(!endpoint||!secret)throw new Error('stage_keys_required');
const email='verotask-d1-auth-check-20261022@example.invalid';
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const tokenHash=sha(randomBytes(32).toString('hex'));
const sessionHash=sha(randomBytes(32).toString('hex'));
async function call(mode:string,payload:unknown,authorize=true){
  const body=JSON.stringify(payload);const timestamp=String(Date.now());
  const signature=createHmac('sha256',secret!).update(timestamp+'\n'+body).digest('hex');
  const res=await fetch(endpoint+'/internal/auth/'+mode,{method:'POST',headers:{'content-type':'application/json',...(authorize?{'x-vt-timestamp':timestamp,'x-vt-signature':signature}:{})},body});
  const response=await res.json() as Record<string,unknown>;
  return {status:res.status,body:response};
}
const future=(n:number)=>new Date(Date.now()+n*60_000).toISOString();
async function test(){
  assert.equal((await call('issue',{email,tokenHash,redirectPath:'/dashboard',expiresAt:future(15)},false)).status,401);
  assert.equal((await call('issue',{email:'someone@real-domain.com',tokenHash,redirectPath:'/dashboard',expiresAt:future(15)})).status,400);
  const created=await call('issue',{email,tokenHash,redirectPath:'/dashboard',expiresAt:future(15)});
  assert.equal(created.status,201,JSON.stringify(created.body));
  const used=await call('consume',{tokenHash,sessionHash,sessionExpiresAt:future(1440)});
  assert.equal(used.status,200,JSON.stringify(used.body));
  assert.equal(used.body.email,email);
  assert.equal(used.body.redirectPath,'/dashboard');
  assert.equal((await call('consume',{tokenHash,sessionHash:sha('other-session'),sessionExpiresAt:future(1440)})).status,409);
  const alive=await call('session',{sessionHash});
  assert.equal(alive.status,200,JSON.stringify(alive.body));
  assert.equal((alive.body.user as Record<string,unknown>).email,email);
  assert.equal((await call('signout',{sessionHash})).status,200);
  assert.equal((await call('session',{sessionHash})).status,401);
  const revocable=sha(randomBytes(32).toString('hex'));
  assert.equal((await call('issue',{email,tokenHash:revocable,redirectPath:'/dashboard',expiresAt:future(15)})).status,201);
  assert.equal((await call('revoke',{tokenHash:revocable})).status,200);
  assert.equal((await call('consume',{tokenHash:revocable,sessionHash:sha('cannot-consume'),sessionExpiresAt:future(1440)})).status,409);
  assert.equal((await call('issue',{email:'owner@example.com',tokenHash:sha('dummy'),redirectPath:'//evil.test',expiresAt:future(15)})).status,400);
  console.log('D1_REMOTE_AUTH_PASS: signed issue, non-real-email lock, single-use consumption, user/session creation, session logout, replay rejection and redirect protection');
}
test().catch(error=>{ console.error('D1_REMOTE_AUTH_FAILED:',error instanceof Error?error.message:'unknown');process.exitCode=1;});
