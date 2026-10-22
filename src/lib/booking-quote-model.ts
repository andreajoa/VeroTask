export type QuoteRequestInput={
 bookingId:string;customerId:string;businessId:string;serviceId:string|null;
 scheduledStart:string;scheduledEnd:string;serviceAddress:string;
 serviceLatitude:number|null;serviceLongitude:number|null;customerNotes:string;
 commissionBps:number;servicePinHash:string;
 volumeRateEvent:Record<string,unknown>|null;quoteEvent:Record<string,unknown>;
 providerRecipientEmail:string|null;providerClaimed:boolean;
};
