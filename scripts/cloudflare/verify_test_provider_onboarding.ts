/** Cloudflare D1 staging-only provider onboarding concurrency/replay smoke test.
 * Seed the dedicated synthetic user/category before running, then clean them up.
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const url=process.env.D1_STAGING_HTTP_URL;
const secret=process.env.D1_STAGING_BRIDGE_SECRET;
if (!url || !secret) throw new Error('staging_settings_missing');
const path='/internal/test-create-provider';
const ownerId='a5555555-5555-4555-8555-555555555555';
const categoryId='e4444444-4444-4444-8444-444444444444';
const businessA='b6666666-6666-4666-8666-666666666666';
const businessB='b7777777-7777-4777-8777-777777777777';
const valid={ownerId,businessId:businessA,categoryId,slug:'d1-synthetic-orlando-test-20261022'};

async function signed(path:string,payload:unknown){
  const body=JSON.stringify(payload);
  const timestamp=String(Date.now());
  const signature=createHmac('sha256',secret!).update(timestamp+'\n'+body).digest('hex');
  const response=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},body});
  return {status:response.status,body:await response.json() as Record<string,unknown>};
}

async function query(sql:string,params:unknown[]=[]){
  const result=await signed('/internal/sqlite-read',{query:{sql,params,method:'all'}});
  assert.equal(result.status,200,'staging query failed');
  return result.body.rows as unknown[][];
}

async function main(){
  const noAuth=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(valid)});
  assert.equal(noAuth.status,401);
  assert.equal((await signed(path,{...valid,slug:'provider-real-name'})).status,400);
  assert.equal((await signed(path,{...valid,categoryId:'f8888888-8888-4888-8888-888888888888'})).status,409);
  const [first,second]=await Promise.all([
    signed(path,valid),
    signed(path,{...valid,businessId:businessB,slug:'d1-synthetic-orlando-replay-20261022'})
  ]);
  assert.deepEqual([first.status,second.status].sort(),[200,201]);
  assert.deepEqual([first.body.outcome,second.body.outcome].sort(),['already_exists','created']);
  const ownerBusinesses=await query('SELECT id FROM businesses WHERE owner_user_id=?',[ownerId]);
  assert.equal(ownerBusinesses.length,1);
  const id=ownerBusinesses[0][0];
  assert.ok(id===businessA || id===businessB);
  assert.deepEqual(await query('SELECT COUNT(*) FROM business_categories WHERE business_id=?',[id]),[[1]]);
  assert.deepEqual(await query('SELECT role FROM users WHERE id=?',[ownerId]),[['provider']]);
  const replay=await signed(path,valid);
  assert.equal(replay.status,200);
  assert.equal(replay.body.businessId,id);
  console.log('D1_ONBOARDING_STAGING_PASS: protected signing, idempotent concurrent enrollment, one business, one category, provider role');
}
main().catch(e=>{console.error('D1_ONBOARDING_STAGING_FAIL',e);process.exitCode=1;});
