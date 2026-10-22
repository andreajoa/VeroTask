export type CreateBookingInput={
 bookingId:string;customerId:string;businessId:string;serviceId:string;
 scheduledStart:string;scheduledEnd:string;serviceAddress:string;
 serviceLatitude:number|null;serviceLongitude:number|null;
 customerNotes:string|null;
 subtotalCents:number;marketplaceFeeCents:number;providerAmountCents:number;commissionBps:number;
 servicePinHash:string;
 volumeRateEvent:Record<string,unknown>|null;
 requestedEvent:Record<string,unknown>;
};
