import { addMinutes } from "date-fns";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingSecrets } from "@/db/operations-schema";
import { bookingEvents, bookings, businesses, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkProviderAvailability } from "@/lib/availability";
import { hashServicePin, parseServiceLocalDateTime, servicePinForBooking } from "@/lib/booking";
import { sendProviderNewRequestNotification } from "@/lib/booking-notifications";
import { POLICY_VERSION } from "@/lib/booking-workflow";
import { geocodeUsAddress } from "@/lib/geocoding";
import { calculateBookingAmounts, type PlanKey } from "@/lib/plans";

const schema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  scheduledLocal: z.string().min(10).max(40),
  serviceAddress: z.string().trim().min(8).max(500),
  customerNotes: z.string().trim().max(2000).optional(),
  acceptsPolicy: z.literal(true)
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_booking" }, { status: 400 });

  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, parsed.data.businessId)).limit(1);
  if (!business || business.status !== "active" || !business.ownerUserId || !business.stripePayoutsEnabled || !business.stripeConnectAccountId) {
    return NextResponse.json({ error: "provider_not_bookable" }, { status: 409 });
  }
  if (business.ownerUserId === user.id) return NextResponse.json({ error: "cannot_book_own_business" }, { status: 409 });

  const [service] = await db.select().from(services).where(and(
    eq(services.id, parsed.data.serviceId),
    eq(services.businessId, business.id),
    eq(services.active, true)
  )).limit(1);
  if (!service || service.pricingType !== "fixed" || !service.basePriceCents || service.basePriceCents <= 0) {
    return NextResponse.json({ error: "service_not_bookable" }, { status: 409 });
  }

  let scheduledStart: Date;
  try {
    scheduledStart = parseServiceLocalDateTime(parsed.data.scheduledLocal);
  } catch {
    return NextResponse.json({ error: "invalid_schedule" }, { status: 400 });
  }
  if (scheduledStart.getTime() < Date.now() + 60 * 60 * 1000) {
    return NextResponse.json({ error: "schedule_too_soon" }, { status: 409 });
  }

  const scheduledEnd = addMinutes(scheduledStart, service.durationMinutes ?? 60);
  const availability = await checkProviderAvailability(business.id, scheduledStart, scheduledEnd);
  if (!availability.available) {
    return NextResponse.json({ error: availability.reason }, { status: 409 });
  }

  const amounts = calculateBookingAmounts(service.basePriceCents, business.plan as PlanKey);
  const geocoded = await geocodeUsAddress(parsed.data.serviceAddress);

  const [booking] = await db.insert(bookings).values({
    customerId: user.id,
    businessId: business.id,
    serviceId: service.id,
    status: "requested",
    scheduledStart,
    scheduledEnd,
    serviceAddress: parsed.data.serviceAddress,
    serviceLatitude: geocoded?.latitude,
    serviceLongitude: geocoded?.longitude,
    customerNotes: parsed.data.customerNotes,
    subtotalCents: amounts.totalCents,
    marketplaceFeeCents: amounts.marketplaceFeeCents,
    providerAmountCents: amounts.providerAmountCents,
    currency: "usd",
    commissionBpsSnapshot: amounts.commissionBps
  }).returning();

  const pin = servicePinForBooking(booking.id);
  await db.insert(bookingSecrets).values({ bookingId: booking.id, servicePinHash: hashServicePin(pin) });
  await db.insert(bookingEvents).values({
    bookingId: booking.id,
    actorUserId: user.id,
    eventType: "booking_requested",
    nextStatus: "requested",
    metadata: {
      serviceName: service.name,
      policyAccepted: true,
      policyVersion: POLICY_VERSION,
      customerProtectionHours: 24,
      serviceGeocoded: Boolean(geocoded),
      geocodingSource: geocoded?.source ?? null,
      matchedAddress: geocoded?.matchedAddress ?? null,
      providerDecisionRequiredBeforePayment: true
    }
  });

  try { await sendProviderNewRequestNotification(booking.id); }
  catch (error) { console.error("[VeroTask booking request notification]", error); }

  return NextResponse.json({ bookingId: booking.id, status: booking.status });
}
