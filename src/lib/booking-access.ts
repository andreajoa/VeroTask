import { getBookingContext } from "@/lib/booking-workflow";

export async function bookingAccess(bookingId: string, userId: string) {
  const context = await getBookingContext(bookingId);
  if (!context) return null;

  const isCustomer = context.booking.customerId === userId;
  const isProvider = context.business.ownerUserId === userId;
  return { ...context, isCustomer, isProvider, allowed: isCustomer || isProvider };
}

export async function requireProviderBooking(bookingId: string, userId: string) {
  const access = await bookingAccess(bookingId, userId);
  if (!access || !access.isProvider) throw new Error("forbidden");
  return access;
}

export async function requireCustomerBooking(bookingId: string, userId: string) {
  const access = await bookingAccess(bookingId, userId);
  if (!access || !access.isCustomer) throw new Error("forbidden");
  return access;
}
