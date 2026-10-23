import {openDisputeAtomic} from '@/db/transactional-open-dispute';
import type {OpenDisputeInput} from '@/lib/dispute-open-model';
import {refundBookingPaymentAtomic,cancelBookingTransaction,resolveBookingDispute,finalizeDisputeResolutionForRefund} from '@/db/transactional-finance';
export {disputeAvailabilityError} from '@/lib/dispute-availability';
export {resolutionValidationError,refundCompletionState,cancellationPolicy} from '@/lib/dispute-financial-policy';
export {refundBookingPaymentAtomic,cancelBookingTransaction,resolveBookingDispute,finalizeDisputeResolutionForRefund};

type AdminUser={id:string;role:string}|null;
export function disputeAdminActor(user:AdminUser,hasAdminSession:boolean){
 if(user&&(user.role==='admin'||user.role==='support'))return {allowed:true as const,actorUserId:user.id};
 if(hasAdminSession)return {allowed:true as const,actorUserId:null};
 return {allowed:false as const,actorUserId:null};
}
export async function openBookingDispute(input:OpenDisputeInput){return openDisputeAtomic(input)}
