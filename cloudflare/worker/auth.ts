/** Atomic, HMAC-protected D1 magic-link authentication. Staging limits to
 * example.invalid test identities; never switch on for real users until the
 * full database and payment migration is signed off.
 */
interface Statement {
  bind(...values: (string|number|null)[]): Statement;
  raw<T=unknown>(): Promise<T[][]>;
}
interface AuthDB { prepare(sql:string): Statement }
export type AuthReply = {status:number;body:Record<string,unknown>};
const hash=/^[a-f0-9]{64}$/;
const emailPattern=/^[a-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const redirectSafe=(s:unknown):s is string => typeof s==='string' && s.startsWith('/') && !s.startsWith('//') && !s.includes('\\') && s.length<=500;
const isIso=(v:unknown):v is string=>typeof v==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && !Number.isNaN(Date.parse(v));
const reply=(status:number,outcome:string,extra:Record<string,unknown>={}):AuthReply=>({status,body:{ok:status<300,outcome,...extra}});

export async function authD1(db:AuthDB,mode:string,input:unknown,allowReal=false):Promise<AuthReply>{
  if(!input||typeof input!=='object') return reply(400,'invalid_request');
  const p=input as Record<string,unknown>;
  if(mode==='issue') {
    const email=p.email;
    if(typeof email!=='string'||email.length>320||email!==email.toLowerCase()||!emailPattern.test(email) ||
       (!allowReal&&!email.endsWith('@example.invalid')) || typeof p.tokenHash!=='string'||!hash.test(p.tokenHash) ||
       !redirectSafe(p.redirectPath)||!isIso(p.expiresAt)||
       Date.parse(p.expiresAt)<=Date.now() || Date.parse(p.expiresAt)>Date.now()+16*60_000) return reply(400,'invalid_issue');
    // One atomic SQL prevents concurrent magic links bypassing the 5/15m cap.
    const rows=await db.prepare(`INSERT INTO auth_tokens(email,token_hash,redirect_path,expires_at)
      SELECT ?,?,?,? WHERE
      (SELECT count(*) FROM auth_tokens WHERE email=? AND julianday(created_at)>=julianday('now','-15 minutes')) < 5
      RETURNING id`).bind(email,p.tokenHash,p.redirectPath,p.expiresAt,email).raw();
    return rows.length===1?reply(201,'issued'):reply(429,'rate_limited');
  }
  if(mode==='consume') {
    if(typeof p.tokenHash!=='string'||!hash.test(p.tokenHash)||
       typeof p.sessionHash!=='string'||!hash.test(p.sessionHash)||!isIso(p.sessionExpiresAt)||
       Date.parse(p.sessionExpiresAt)<=Date.now()+60_000||Date.parse(p.sessionExpiresAt)>Date.now()+32*24*3600_000) return reply(400,'invalid_consume');
    const updated=await db.prepare(`UPDATE auth_tokens
      SET used_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),consumed_session_hash=?,consumed_session_expires_at=?
      WHERE token_hash=? AND used_at IS NULL AND julianday(expires_at)>julianday('now')
      RETURNING email,redirect_path`).bind(p.sessionHash,p.sessionExpiresAt,p.tokenHash).raw<string>();
    // The AFTER UPDATE SQLite trigger creates the user and session atomically.
    if(updated.length!==1) return reply(409,'invalid_or_consumed_link');
    return reply(200,'signed_in',{email:updated[0][0],redirectPath:updated[0][1]});
  }
  if(mode==='revoke') {
    if(typeof p.tokenHash!=='string'||!hash.test(p.tokenHash))return reply(400,'invalid_revoke');
    await db.prepare('DELETE FROM auth_tokens WHERE token_hash=? AND used_at IS NULL').bind(p.tokenHash).raw();
    return reply(200,'revoked');
  }
  if(mode==='session') {
    if(typeof p.sessionHash!=='string'||!hash.test(p.sessionHash)) return reply(400,'invalid_session');
    const rows=await db.prepare(`SELECT u.id,u.email,u.role,u.locale,u.name,u.phone,u.stripe_customer_id,u.created_at,u.updated_at FROM sessions s
      JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') LIMIT 1`)
      .bind(p.sessionHash).raw();
    return rows.length?reply(200,'valid_session',{user:{id:rows[0][0],email:rows[0][1],role:rows[0][2],locale:rows[0][3],name:rows[0][4],phone:rows[0][5],stripeCustomerId:rows[0][6],createdAt:rows[0][7],updatedAt:rows[0][8]}}):reply(401,'expired_session');
  }
  if(mode==='signout') {
    if(typeof p.sessionHash!=='string'||!hash.test(p.sessionHash)) return reply(400,'invalid_session');
    await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(p.sessionHash).raw();
    return reply(200,'signed_out');
  }
  return reply(404,'unknown_method');
}
