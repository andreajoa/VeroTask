import {env} from 'cloudflare:workers';
import {authD1 as runNativeD1Auth} from '../../cloudflare/worker/auth';
/** Native Cloudflare D1 auth adapter behind opt-in AUTH_STORE=d1.
 * Do not enable for real customers before full app data and payment migration.
 */
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { requestAppUrl } from '@/lib/app-url';
import { clearSessionCookieOptions, SESSION_COOKIE, SESSION_DAYS, sessionCookieOptions } from '@/lib/auth-session-cookie';
import type { users } from '@/db/schema';

type User=typeof users.$inferSelect;
type AuthResponse={ok?:boolean;outcome?:string;email?:string;redirectPath?:string;user?:Record<string,unknown>};
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');

async function authD1(method:string,data:Record<string,unknown>):Promise<{status:number;body:AuthResponse}>{
  if (!env.DB) throw new Error('d1_auth_binding_missing');
  // Cloudflare D1 is bound directly to this server Worker. Never transmit raw
  // login/session tokens over the network, and never execute in client code.
  const response=await runNativeD1Auth(env.DB as Parameters<typeof runNativeD1Auth>[0],method,data,true);
  return {status:response.status,body:response.body as AuthResponse};
}

function redirectPath(input?:string|null){
  if(!input||!input.startsWith('/')||input.startsWith('//')||input.includes('\\'))return '/dashboard';
  return input.slice(0,500);
}

export async function createMagicLinkD1(emailInput:string,next?:string|null,origin?:string|null){
  const email=emailInput.trim().toLowerCase();
  const raw=randomBytes(32).toString('hex');
  const response=await authD1('issue',{
    email,tokenHash:hash(raw),redirectPath:redirectPath(next),expiresAt:new Date(Date.now()+15*60_000).toISOString()
  });
  if(response.status===429)throw new Error('auth_rate_limited');
  if(response.status!==201)throw new Error('d1_auth_unavailable');
  return `${requestAppUrl(origin)}/api/auth/verify?token=${encodeURIComponent(raw)}`;
}

export async function consumeMagicLinkD1(raw:string):Promise<{user:User;redirectPath:string}|null>{
  if(!/^[0-9a-f]{64}$/.test(raw))return null;
  const session=randomBytes(32).toString('hex');
  const expiry=new Date(Date.now()+SESSION_DAYS*24*60*60*1000);
  const result=await authD1('consume',{
    tokenHash:hash(raw),sessionHash:hash(session),sessionExpiresAt:expiry.toISOString()
  });
  if(result.status===409)return null;
  if(result.status!==200)throw new Error('d1_auth_unavailable');
  const user=await currentUserByD1Hash(hash(session));
  if(!user)throw new Error('d1_session_creation_failed');
  const store=await cookies();
  store.set(SESSION_COOKIE,session,sessionCookieOptions(expiry,process.env.NODE_ENV==='production'));
  return {user,redirectPath:redirectPath(result.body.redirectPath)};
}

async function currentUserByD1Hash(sessionHash:string):Promise<User|null>{
  const answer=await authD1('session',{sessionHash});
  if(answer.status===401)return null;
  if(answer.status!==200||!answer.body.user)throw new Error('d1_session_lookup_failed');
  const row=answer.body.user;
  if(typeof row.id!=='string'||typeof row.email!=='string')throw new Error('d1_user_invalid');
  return {
    id:row.id,email:row.email,name:typeof row.name==='string'?row.name:null,
    phone:typeof row.phone==='string'?row.phone:null,
    role:row.role==='provider'||row.role==='admin'||row.role==='support'?row.role:'customer',
    locale:typeof row.locale==='string'?row.locale:'en-US',
    stripeCustomerId:typeof row.stripeCustomerId==='string'?row.stripeCustomerId:null,
    createdAt:new Date(String(row.createdAt??new Date().toISOString())),
    updatedAt:new Date(String(row.updatedAt??new Date().toISOString()))
  };
}

export async function getCurrentUserD1():Promise<User|null>{
  const raw=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!raw||!/^[0-9a-f]{64}$/.test(raw))return null;
  return currentUserByD1Hash(hash(raw));
}

export async function signOutD1(){
  const store=await cookies();
  const raw=store.get(SESSION_COOKIE)?.value;
  try{ if(raw&&/^[0-9a-f]{64}$/.test(raw))await authD1('signout',{sessionHash:hash(raw)}); }
  finally{store.set(SESSION_COOKIE,'',clearSessionCookieOptions(process.env.NODE_ENV==='production'));}
}

export async function revokeMagicLinkD1(link:string){
  const raw=new URL(link).searchParams.get('token');
  if(!raw||!/^[0-9a-f]{64}$/.test(raw))return false;
  const result=await authD1('revoke',{tokenHash:hash(raw)});
  return result.status===200;
}
