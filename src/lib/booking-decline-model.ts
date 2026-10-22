export type BookingDeclineInput = {
  bookingId: string;
  actorUserId: string;
  previousStatus: 'requested' | 'accepted';
  reason: string | null;
};
