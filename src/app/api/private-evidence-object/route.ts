export const runtime='nodejs';
export const dynamic='force-dynamic';

// Direct R2 object access exists only inside the Cloudflare Worker (native R2 binding).
// Elsewhere evidence uses presigned S3 URLs, and `cloudflare:workers` cannot be loaded.
async function handle(request:Request){
  if(process.env.STORAGE_BACKEND!=='r2-binding')return new Response('Not found',{status:404});
  const {privateEvidenceRequest}=await import('@/lib/storage-worker');
  return privateEvidenceRequest(request);
}
export async function PUT(request:Request){return handle(request)}
export async function GET(request:Request){return handle(request)}
