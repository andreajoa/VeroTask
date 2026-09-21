import { addMinutes } from "date-fns";
import { and, count, eq, gte } from "drizzle-orm";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, getTransactionalDb } from "@/db";
import { bookingSecrets } from "@/db/operations-schema";
import { bookingEvents, bookings, businesses, services } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkProviderAvailability } from "@/lib/availability";
import { hashServicePin, parseServiceLocalDateTime, servicePinForBooking } from "@/lib/booking";
import { distanceMiles } from "@/lib/distance";
import { geocodeUsAddress, geocodeUsPostalCode } from "@/lib/geocoding";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { containsDirectContactInfo, containsExactServiceAddress, serializeQuoteRequestBrief } from "@/lib/quote-request";
import { kickTransactionalEmailOutbox, queueBookingEmail } from "@/lib/transactional-email-outbox";

const schema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  task: z.string().trim().min(3).max(180),
  scope: z.enum(["small", "medium", "large", "unsure"]),
  jobLength: z.enum(["under-2h", "half-day", "full-day", "multi-day", "unsure"]),
  timeline: z.enum(["asap", "this-week", "flexible", "specific-date"]),
  postalCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  scheduledLocal: z.string().min(10).max(40),
  serviceAddress: z.string().trim().min(8).max(500),
  details: z.string().trim().min(20).max(4000),
  acceptsPolicy: z.literal(true)
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_quote_request" }, { status: 400 });

  if (containsDirectContactInfo(parsed.data.task) || containsDirectContactInfo(parsed.data.details)) {
    return NextResponse.json({ error: "direct_contact_not_allowed" }, { status: 400 });
  }
  if (
    containsExactServiceAddress(parsed.data.task, parsed.data.serviceAddress) ||
    containsExactServiceAddress(parsed.data.details, parsed.data.serviceAddress)
  ) {
    return NextResponse.json({ error: "exact_address_not_allowed_in_job_brief" }, { status: 400 });
  }

  const db = getDb();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const [[recentTotal], [recentSameProvider]] = await Promise.all([
    db.select({ value: count() }).from(bookings).where(and(
      eq(bookings.customerId, user.id),
      gte(bookings.createdAt, tenMinutesAgo)
    )),
    db.select({ value: count() }).from(bookings).where(and(
      eq(bookings.customerId, user.id),
      eq(bookings.businessId, parsed.data.businessId),
      gte(bookings.createdAt, thirtyMinutesAgo)
    ))
  ]);
  if (Number(recentTotal?.value ?? 0) >= 8) {
    return NextResponse.json({ error: "too_many_quote_requests", retryAfterMinutes: 10 }, { status: 429 });
  }
  if (Number(recentSameProvider?.value ?? 0) >= 3) {
    return NextResponse.json({ error: "too_many_requests_to_same_provider", retryAfterMinutes: 30 }, { status: 429 });
  }

  const [business] = await db.select().from(businesses).where(eq(businesses.id, parsed.data.businessId)).limit(1);
  if (!business || !business.active || ["suspended", "paused"].includes(business.status)) {
    return NextResponse.json({ error: "provider_not_available" }, { status: 409 });
  }
  if (business.country !== "US" || business.state !== "FL") {
    return NextResponse.json({ error: "provider_outside_launch_market" }, { status: 409 });
  }
  if (business.ownerUserId === user.id) {
    return NextResponse.json({ error: "cannot_request_own_business" }, { status: 409 });
  }
  if (!business.ownerUserId && !business.publicEmail) {
    return NextResponse.json({ error: "provider_contact_unavailable" }, { status: 409 });
  }

  let service = null as typeof services.$inferSelect | null;
  if (parsed.data.serviceId) {
    const [row] = await db.select().from(services).where(and(
      eq(services.id, parsed.data.serviceId),
      eq(services.businessId, business.id),
      eq(services.active, true)
    )).limit(1);
    if (!row) return NextResponse.json({ error: "service_not_available" }, { status: 409 });
    service = row;
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

  const durationMinutes = service?.durationMinutes ?? (
    parsed.data.jobLength === "under-2h" ? 120 :
    parsed.data.jobLength === "half-day" ? 240 :
    parsed.data.jobLength === "full-day" ? 480 :
    parsed.data.jobLength === "multi-day" ? 1440 : 120
  );
  const scheduledEnd = addMinutes(scheduledStart, durationMinutes);
  const availability = await checkProviderAvailability(business.id, scheduledStart, scheduledEnd);
  if (!availability.available) {
    return NextResponse.json({ error: availability.reason }, { status: 409 });
  }
  const geocoded = await geocodeUsAddress(parsed.data.serviceAddress);
  const customerPoint = geocoded ?? await geocodeUsPostalCode(parsed.data.postalCode);

  let providerPoint =
    typeof business.latitude === "number" && typeof business.longitude === "number"
      ? { latitude: business.latitude, longitude: business.longitude }
      : null;

  if (!providerPoint && business.addressLine1) {
    const geocodedProvider = await geocodeUsAddress(
      `${business.addressLine1}, ${business.city}, ${business.state} ${business.postalCode ?? ""}`
    );
    if (geocodedProvider) {
      providerPoint = geocodedProvider;
      await db.update(businesses).set({
        latitude: geocodedProvider.latitude,
        longitude: geocodedProvider.longitude,
        updatedAt: new Date()
      }).where(eq(businesses.id, business.id));
    }
  }

  if (!providerPoint && business.postalCode) {
    providerPoint = await geocodeUsPostalCode(business.postalCode);
  }

  let serviceDistanceMiles: number | null = null;
  if (customerPoint && providerPoint) {
    serviceDistanceMiles = distanceMiles(providerPoint, customerPoint);
    if (serviceDistanceMiles > business.serviceRadiusMiles) {
      return NextResponse.json({
        error: "provider_outside_service_radius",
        distanceMiles: Number(serviceDistanceMiles.toFixed(1)),
        serviceRadiusMiles: business.serviceRadiusMiles
      }, { status: 409 });
    }
  } else if (business.ownerUserId) {
    return NextResponse.json({ error: "provider_location_not_ready" }, { status: 409 });
  }

  const plan = business.plan as PlanKey;
  const commissionBps = PROVIDER_PLANS[plan].commissionBps;

  const booking = await getTransactionalDb().transaction(async (tx) => {
  const [booking] = await tx.insert(bookings).values({
    customerId: user.id,
    businessId: business.id,
    serviceId: service?.id,
    status: "requested",
    scheduledStart,
    scheduledEnd,
    serviceAddress: parsed.data.serviceAddress,
    serviceLatitude: geocoded?.latitude,
    serviceLongitude: geocoded?.longitude,
    customerNotes: serializeQuoteRequestBrief({
      task: parsed.data.task,
      scope: parsed.data.scope,
      jobLength: parsed.data.jobLength,
      timeline: parsed.data.timeline,
      postalCode: parsed.data.postalCode,
      details: parsed.data.details
    }),
    subtotalCents: 0,
    marketplaceFeeCents: 0,
    providerAmountCents: 0,
    currency: "usd",
    commissionBpsSnapshot: commissionBps
  }).returning();

  const pin = servicePinForBooking(booking.id);
  await tx.insert(bookingSecrets).values({ bookingId: booking.id, servicePinHash: hashServicePin(pin) });
  await tx.insert(bookingEvents).values({
    bookingId: booking.id,
    actorUserId: user.id,
    eventType: "quote_requested",
    nextStatus: "requested",
    metadata: {
      task: parsed.data.task,
      scope: parsed.data.scope,
      jobLength: parsed.data.jobLength,
      timeline: parsed.data.timeline,
      postalCode: parsed.data.postalCode,
      exactAddressWithheldFromProvider: true,
      customerContactWithheld: true,
      providerClaimedAtRequest: Boolean(business.ownerUserId),
      serviceDistanceMiles: serviceDistanceMiles === null ? null : Number(serviceDistanceMiles.toFixed(2)),
      providerServiceRadiusMiles: business.serviceRadiusMiles,
      paymentModel: "booking_fee_only"
    }
  });

  await queueBookingEmail(tx, {
    kind: business.ownerUserId ? "provider_new_request" : "unclaimed_provider_opportunity",
    bookingId: booking.id,
    recipientEmail: business.ownerUserId ? null : business.publicEmail,
    idempotencyKey: `booking:${booking.id}:provider-request`,
    expiresAt: scheduledStart
  });
  await queueBookingEmail(tx, {
    kind: "customer_request_received",
    bookingId: booking.id,
    idempotencyKey: `booking:${booking.id}:customer-request`
  });

  return booking;
  });

  after(() => kickTransactionalEmailOutbox(booking.id));

  return NextResponse.json({
    bookingId: booking.id,
    status: booking.status,
    notificationStatus: "queued",
    providerClaimed: Boolean(business.ownerUserId),
    responseExpectation: business.ownerUserId ? "about_2_business_hours" : "first_response_may_take_longer"
  });
}
