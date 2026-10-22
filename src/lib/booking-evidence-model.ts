import type { SubmittedEvidenceType } from '@/lib/evidence-policy';

export type EvidenceWriteInput = {
  bookingId:string;
  actorUserId:string;
  actor:'provider'|'customer';
  type:SubmittedEvidenceType;
  objectRef:string|null;
  note:string|null;
  metadata:Record<string,unknown>;
};
export type EvidenceWriteResult =
  | {ok:true;evidenceId:string}
  | {ok:false;error:'booking_not_found'|'evidence_not_available_for_actor_or_status'|'photo_upload_already_attached'};
