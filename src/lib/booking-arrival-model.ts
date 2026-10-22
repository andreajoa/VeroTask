export type ArrivalRequestInput={
 bookingId:string;
 actorUserId:string;
 requestId:string;
 latitude:number;
 longitude:number;
 accuracyMeters:number|null;
 distanceMeters:number;
 geofenceMeters:number;
 recipientEmail:string;
};
