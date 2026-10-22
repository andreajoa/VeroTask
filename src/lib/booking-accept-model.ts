export type AcceptQuoteInput={
 bookingId:string;actorUserId:string;
 subtotalCents:number;marketplaceFeeCents:number;providerAmountCents:number;commissionBps:number;
 metadata:Record<string,unknown>;
};
