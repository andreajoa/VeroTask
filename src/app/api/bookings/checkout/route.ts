import { addMinutes } from "date-fns";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingSecrets } from "@/db/operations-schema";
import { bookingEvents, bookings, businesses, services, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hashServicePin, parseServiceLocalDateTime, servicePinForBooking } from "@/lib/booking";
import { calculateBookingAmounts, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

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
  const amounts = calculateBookingAmounts(service.basePriceCents, business.plan as PlanKey);

  const [booking] = await db.insert(bookings).values({
    customerId: user.id,
    businessId: business.id,
    serviceId: service.id,
    status: "requested",
    scheduledStart,
    scheduledEnd,
    serviceAddress: parsed.data.serviceAddress,
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
    eventType: "booking_created",
    nextStatus: "requested",
    metadata: { serviceName: service.name, policyAccepted: true }
  });

  const stripe = getStripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined, metadata: { verotask_user_id: user.id } });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    customer: customerId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: booking.subtotalCents,
        product_data: {
          name: service.name,
          description: `${business.name} · ${business.city}, ${business.state}`
        }
      }
    }],
    payment_intent_data: {
      transfer_group: `verotask_booking_${booking.id}`,
      metadata: {
        verotask_booking_id: booking.id,
        verotask_business_id: business.id
      }
    },
    metadata: {
      verotask_booking_id: booking.id,
      verotask_business_id: business.id,
      verotask_service_id: service.id
    },
    return_url: `${baseUrl}/bookings/${booking.id}?checkout=return&session_id={CHECKOUT_SESSION_ID}`
  });

  if (!session.client_secret) return NextResponse.json({ error: "checkout_unavailable" }, { status: 500 });
  return NextResponse.json({ bookingId: booking.id, clientSecret: session.client_secret });
}
