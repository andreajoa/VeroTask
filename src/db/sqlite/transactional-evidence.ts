import { createHmac } from 'node:crypto';
import type { EvidenceWriteInput, EvidenceWriteResult } from '@/lib/booking-evidence-model';
/** All staging D1 evidence changes are disabled at the Worker until release approval. */
export async function createBookingEvidenceAtomic(input:EvidenceWriteInput):Promise<EvidenceWriteResult>{
  const url=process.env.D1_STAGING_HTTP_URL,secret=process.env.D1_STAGING_BRIDGE_SECRET;
  if(!url||!secret||!/^https:\/\/[^/?#]+\/?$/.test(url))throw new Error('d1_evidence_unavailable');
  const body=JSON.stringify(input),timestamp=String(Date.now());
  const signature=createHmac('sha256',secret).update(timestamp+'\n'+body).digest('hex');
  const response=await fetch(url.replace(/\/$/,'')+'/internal/evidence',{
    method:'POST',headers:{'content-type':'application/json','x-vt-timestamp':timestamp,'x-vt-signature':signature},
    body,cache:'no-store',signal:AbortSignal.timeout(12_000)
  });
  if(response.status>=500)throw new Error('d1_evidence_unavailable');
  if(response.status===403)throw new Error('d1_evidence_forbidden');
  return response.json() as Promise<EvidenceWriteResult>;
}
