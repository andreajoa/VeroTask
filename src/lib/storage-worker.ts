/** Cloudflare-native R2 evidence storage. The DB authorizes issuance before a
 * 5-minute scoped bearer URL is created. Only valid private evidence paths can
 * ever be read or written. Disabled while UPLOAD_SIGNING_SECRET is absent.
 */
import {env} from 'cloudflare:workers';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {contentTypeForEvidenceObjectRef,hasEvidenceImageMagic,MAX_EVIDENCE_IMAGE_BYTES,type EvidenceImageContentType} from '@/lib/evidence-policy';
export function isEvidenceObjectRef(value:string){
 const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
 return new RegExp('^r2://booking-evidence/'+uuid+'/(before|after)/'+uuid+'\\.(jpg|png|webp)$','i').test(value);
}

type R2Object={size:number;httpMetadata?:{contentType?:string};customMetadata?:Record<string,string>};
type R2Get=R2Object&{body:ReadableStream<Uint8Array>};
type Bucket={put(key:string,value:Uint8Array|string,options?:Record<string,unknown>):Promise<unknown>;
 head(key:string):Promise<R2Object|null>;get(key:string,options?:Record<string,unknown>):Promise<R2Get|null>;
 delete(key:string):Promise<void>};
function bucket():Bucket{const b=(env as {R2?:Bucket}).R2;if(!b)throw Error('r2_binding_missing');return b}
function secret(){const s=process.env.UPLOAD_SIGNING_SECRET;if(!s||s.length<32)throw Error('evidence_signing_secret_missing');return s}
const keyFrom=(objectRef:string)=>{if(!isEvidenceObjectRef(objectRef))throw Error('invalid_evidence_object_ref');return objectRef.slice(5)};
const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validKey=/^booking-evidence\/[0-9a-f-]{36}\/(before|after)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
const app=()=>process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')||'';
function mint(method:'PUT'|'GET',key:string,contentType:string,size:number){
 const expires=Date.now()+300_000;
 const packet=Buffer.from(JSON.stringify({method,key,contentType,size,expires})).toString('base64url');
 const signature=createHmac('sha256',secret()).update(packet).digest('hex');
 return `${app()}/api/private-evidence-object?cap=${encodeURIComponent(packet+'.'+signature)}`;
}
function verify(cap:string,method:string):{key:string;contentType:string;size:number}|null{
 if(cap.length>1200)return null;
 const [packet,sig,extra]=cap.split('.');
 if(!packet||!sig||extra||!/^[-\w]+$/.test(packet)||!/^[0-9a-f]{64}$/.test(sig))return null;
 const expected=createHmac('sha256',secret()).update(packet).digest('hex');
 if(!timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex')))return null;
 let data:unknown;try{data=JSON.parse(Buffer.from(packet,'base64url').toString('utf8'))}catch{return null}
 if(!data||typeof data!=='object')return null;
 const p=data as Record<string,unknown>;
 if(p.method!==method||typeof p.expires!=='number'||p.expires<=Date.now()||p.expires>Date.now()+300_000||
   typeof p.key!=='string'||!validKey.test(p.key)||p.key.length>200||
   typeof p.contentType!=='string'||!['image/jpeg','image/png','image/webp'].includes(p.contentType)||
   !Number.isSafeInteger(p.size)||Number(p.size)<=0||Number(p.size)>MAX_EVIDENCE_IMAGE_BYTES)return null;
 const pieces=p.key.split('/');if(!validId.test(pieces[1])||!validId.test(pieces[3].split('.')[0]))return null;
 if(contentTypeForEvidenceObjectRef('r2://'+p.key)!==p.contentType)return null;
 return {key:p.key,contentType:p.contentType,size:Number(p.size)};
}
export async function privateEvidenceRequest(request:Request){
 const method=request.method;
 if(method!=='PUT'&&method!=='GET')return new Response('Method not allowed',{status:405,headers:{allow:'PUT, GET'}});
 const url=new URL(request.url);const cap=url.searchParams.get('cap');
 let payload:ReturnType<typeof verify>;
 try{payload=cap?verify(cap,method):null}catch{return new Response('Unavailable',{status:503})}
 if(!payload)return new Response('Unauthorized',{status:401,headers:{'cache-control':'no-store'}});
 try{
  if(method==='PUT'){
   if(request.headers.get('content-type')?.split(';')[0].trim()!==payload.contentType)return new Response('Invalid type',{status:415});
   const declared=request.headers.get('content-length');
   if(declared&&Number(declared)!==payload.size)return new Response('Invalid length',{status:413});
   const body=new Uint8Array(await request.arrayBuffer());
   if(body.byteLength!==payload.size||body.byteLength>MAX_EVIDENCE_IMAGE_BYTES)return new Response('Invalid length',{status:413});
   if(!hasEvidenceImageMagic(body.subarray(0,12),payload.contentType as EvidenceImageContentType))return new Response('Invalid image',{status:415});
   const existing=await bucket().head(payload.key);
   if(existing)return new Response('Already exists',{status:409});
   await bucket().put(payload.key,body,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:payload.contentType},
     customMetadata:{declaredSize:String(payload.size)}});
   const written=await bucket().head(payload.key);
   return new Response(null,{status:written?.size===payload.size?201:409,headers:{'cache-control':'no-store'}});
  }
  const object=await bucket().get(payload.key);
  if(!object||object.size!==payload.size||object.httpMetadata?.contentType!==payload.contentType)return new Response('Not found',{status:404});
  return new Response(object.body,{status:200,headers:{'content-type':payload.contentType,
   'content-length':String(object.size),'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }catch{return new Response('Object storage unavailable',{status:503})}
}
export async function verifyEvidenceStorageAccess(){
 const key='.verotask-readiness/'+randomUUID()+'.txt';
 try{
  const b=bucket();await b.put(key,'verotask-ready',{httpMetadata:{contentType:'text/plain'}});
  const head=await b.head(key);await b.delete(key);
  return {ok:head?.size===14,errorCode:head?.size===14?null:'storage_probe_empty',httpStatusCode:head?.size===14?200:502};
 }catch{return {ok:false,errorCode:'r2_binding_unavailable',httpStatusCode:null}}
}
export function evidenceStorageReady(){return Boolean((env as {R2?:unknown}).R2)}
export async function createEvidenceUpload(input:{bookingId:string;kind:'before'|'after';contentType:EvidenceImageContentType;byteSize:number}){
 if(!validId.test(input.bookingId)||!Number.isSafeInteger(input.byteSize)||input.byteSize<=0||input.byteSize>MAX_EVIDENCE_IMAGE_BYTES)
   throw Error('invalid_evidence_image_size');
 const ext=input.contentType==='image/png'?'png':input.contentType==='image/webp'?'webp':'jpg';
 const key=`booking-evidence/${input.bookingId}/${input.kind}/${randomUUID()}.${ext}`;
 bucket();const uploadUrl=mint('PUT',key,input.contentType,input.byteSize);
 return {uploadUrl,objectRef:`r2://${key}`,requiredHeaders:{'content-type':input.contentType},expectedByteSize:input.byteSize};
}
export async function createEvidenceDownload(objectRef:string){
 const key=keyFrom(objectRef);const b=bucket();const head=await b.head(key);
 const mime=contentTypeForEvidenceObjectRef(objectRef);
 if(!head||!mime||head.httpMetadata?.contentType!==mime||head.size<=0)return Promise.reject(Error('object_not_found'));
 return mint('GET',key,mime,head.size);
}
export async function inspectEvidenceObject(objectRef:string):Promise<
  {ok:true;byteSize:number;contentType:EvidenceImageContentType}|{ok:false;reason:string}>{
 try{
  const key=keyFrom(objectRef),mime=contentTypeForEvidenceObjectRef(objectRef),b=bucket();
  if(!mime)return {ok:false,reason:'unsupported_image_type'};
  const head=await b.head(key);
  if(!head||head.size<=0||head.size>MAX_EVIDENCE_IMAGE_BYTES||head.httpMetadata?.contentType!==mime||
    head.customMetadata?.declaredSize!==String(head.size))return {ok:false,reason:'invalid_image_size_or_type'};
  const sample=await b.get(key,{range:{offset:0,length:12}});
  if(!sample||!hasEvidenceImageMagic(new Uint8Array(await new Response(sample.body).arrayBuffer()),mime))return {ok:false,reason:'invalid_image_content'};
  return {ok:true,byteSize:head.size,contentType:mime};
 }catch{return {ok:false,reason:'photo_upload_not_found'}}
}
export async function deleteEvidenceObject(objectRef:string){await bucket().delete(keyFrom(objectRef))}
export async function diagnoseEvidenceStorageEndpoints(){return [{kind:'cloudflare-native-r2',...await verifyEvidenceStorageAccess()}]}
