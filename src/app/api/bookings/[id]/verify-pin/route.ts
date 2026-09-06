import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingSecrets } from "@/db/operations-schema";
import { bookingEvidence, bookingEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";
import { hashServicePin } from "@/lib/booking";

const schema = z.object({ pin: z.string().regex(/^\d{6}$/) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_pin" }, { status: 400 });

  try { await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const db = getDb();
  const [secret] = await db.select().from(bookingSecrets).where(eq(bookingSecrets.bookingId, id)).limit(1);
  if (!secret) return NextResponse.json({ error: "pin_unavailable" }, { status: 404 });
  if (secret.pinFailures >= 10) return NextResponse.json({ error: "pin_locked" }, { status: 429 });

  if (hashServicePin(parsed.data.pin) !== secret.servicePinHash) {
    await db.update(bookingSecrets).set({ pinFailures: sql`${bookingSecrets.pinFailures} + 1` }).where(eq(bookingSecrets.id, secret.id));
    return NextResponse.json({ error: "incorrect_pin" }, { status: 409 });
  }

  const [already] = await db.select({ id: bookingEvidence.id }).from(bookingEvidence)
    .where(eq(bookingEvidence.bookingId, id)).limit(100);
  // Multiple proof signals are allowed, but customer PIN itself is recorded once.
  const existingPin = (await db.select({ id: bookingEvidence.id, type: bookingEvidence.type }).from(bookingEvidence)
    .where(eq(bookingEvidence.bookingId, id))).some((row) => row.type === "customer_pin");
  if (!existingPin) {
    await db.insert(bookingEvidence).values({
      bookingId: id,
      submittedByUserId: user.id,
      type: "customer_pin",
      metadata: { verified: true }
    });
    await db.insert(bookingEvents).values({ bookingId: id, actorUserId: user.id, eventType: "customer_pin_verified" });
  }

  void already;
  return NextResponse.json({ ok: true, verified: true });
}
