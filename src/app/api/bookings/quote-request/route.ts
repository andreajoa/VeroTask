import { addMinutes } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingSecrets } from "@/db/operations-schema";
import { bookingEvents, bookings, businesses, services } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { createMagicLink, getCurrentUser } from "@/lib/auth";
import { hashServicePin, parseServiceLocalDateTime, servicePinForBooking } from "@/lib/booking";
import { sendProviderNewRequestNotification, sendUnclaimedProviderOpportunityNotification } from "@/lib/booking-notifications";
import { geocodeUsAddress } from "@/lib/geocoding";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { serializeQuoteRequestBrief } from "@/lib/quote-request";

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_quote_request" }, { status: 400 });

  const db = getDb();
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
  const geocoded = await geocodeUsAddress(parsed.data.serviceAddress);
  const plan = business.plan as PlanKey;
  const commissionBps = PROVIDER_PLANS[plan].commissionBps;

  const [booking] = await db.insert(bookings).values({
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
  await db.insert(bookingSecrets).values({ bookingId: booking.id, servicePinHash: hashServicePin(pin) });
  await db.insert(bookingEvents).values({
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
      paymentModel: "booking_fee_only"
    }
  });

  try {
    if (business.ownerUserId) {
      await sendProviderNewRequestNotification(booking.id);
    } else if (business.publicEmail) {
      const next = `/api/providers/${business.id}/claim-opportunity?booking=${booking.id}`;
      const magicLink = await createMagicLink(business.publicEmail, next, canonicalAppUrl());
      await sendUnclaimedProviderOpportunityNotification(booking.id, business.publicEmail, magicLink);
    }
  } catch (error) {
    console.error("[VeroTask quote request notification]", error);
  }

  return NextResponse.json({ bookingId: booking.id, status: booking.status });
}
