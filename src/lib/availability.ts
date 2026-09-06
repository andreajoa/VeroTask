import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { getDb } from "@/db";
import { providerAvailability } from "@/db/operations-schema";
import { bookings } from "@/db/schema";
import { SERVICE_TIMEZONE } from "@/lib/booking";

export const BLOCKING_BOOKING_STATUSES = [
  "accepted",
  "payment_authorized",
  "scheduled",
  "in_progress",
  "provider_completed",
  "customer_confirmed",
  "auto_completed",
  "disputed",
  "paid_out"
] as const;

function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export async function checkProviderAvailability(businessId: string, start: Date, end: Date) {
  const db = getDb();
  const weekday = Number(formatInTimeZone(start, SERVICE_TIMEZONE, "i")) % 7;
  const startMinutes = Number(formatInTimeZone(start, SERVICE_TIMEZONE, "H")) * 60 + Number(formatInTimeZone(start, SERVICE_TIMEZONE, "m"));
  const endMinutes = Number(formatInTimeZone(end, SERVICE_TIMEZONE, "H")) * 60 + Number(formatInTimeZone(end, SERVICE_TIMEZONE, "m"));

  const rules = await db.select().from(providerAvailability).where(and(
    eq(providerAvailability.businessId, businessId),
    eq(providerAvailability.dayOfWeek, weekday),
    eq(providerAvailability.active, true)
  ));

  if (rules.length > 0) {
    const insidePublishedHours = rules.some((rule) => startMinutes >= minutes(rule.startTime) && endMinutes <= minutes(rule.endTime));
    if (!insidePublishedHours) return { available: false, reason: "outside_provider_hours" as const };
  }

  const [conflict] = await db.select({ id: bookings.id }).from(bookings).where(and(
    eq(bookings.businessId, businessId),
    inArray(bookings.status, [...BLOCKING_BOOKING_STATUSES]),
    lt(bookings.scheduledStart, end),
    gt(bookings.scheduledEnd, start)
  )).limit(1);

  if (conflict) return { available: false, reason: "schedule_conflict" as const };
  return { available: true, reason: null };
}
