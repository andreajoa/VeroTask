export type OpenDisputeReason='provider_no_show'|'service_not_completed'|'service_not_as_described'|'property_damage'|'customer_no_show'|'payment_issue'|'other';
export type OpenDisputeInput={
 bookingId:string;actorUserId:string;reason:OpenDisputeReason;summary:string;
 requestedRefundCents?:number;isCustomer:boolean;isProvider:boolean;
 policyVersion:string;now?:Date;
};
