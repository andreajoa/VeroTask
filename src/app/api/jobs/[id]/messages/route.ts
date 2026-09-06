import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { jobConversations, jobMatches, jobMessages } from "@/db/marketplace-schema";
import { getCurrentUser } from "@/lib/auth";
import { requireCustomerJob, requireProviderJob } from "@/lib/job-access";
import { checkPreBookingMessage, OFF_PLATFORM_WARNING } from "@/lib/marketplace-messaging";

const postSchema = z.object({
  businessId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000)
});

async function authorize(jobId: string, businessId: string, userId: string) {
  const db = getDb();
  try {
    const job = await requireCustomerJob(jobId, userId);
    const [match] = await db.select().from(jobMatches).where(and(eq(jobMatches.jobRequestId, jobId), eq(jobMatches.businessId, businessId))).limit(1);
    if (!match) throw new Error("forbidden");
    return { job, role: "customer" as const };
  } catch {
    const access = await requireProviderJob(jobId, userId, businessId);
    return { job: access.job, role: "provider" as const };
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "business_id_required" }, { status: 400 });

  try { await authorize(id, businessId, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const db = getDb();
  const [conversation] = await db.select().from(jobConversations).where(and(eq(jobConversations.jobRequestId, id), eq(jobConversations.businessId, businessId))).limit(1);
  if (!conversation) return NextResponse.json({ messages: [], warning: OFF_PLATFORM_WARNING });

  const messages = await db.select().from(jobMessages).where(eq(jobMessages.conversationId, conversation.id)).orderBy(asc(jobMessages.createdAt));
  return NextResponse.json({ messages, warning: OFF_PLATFORM_WARNING });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_message" }, { status: 400 });

  let access;
  try { access = await authorize(id, parsed.data.businessId, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  if (!["open", "quoting"].includes(access.job.status)) {
    return NextResponse.json({ error: "pre_booking_chat_closed", bookingId: access.job.bookingId }, { status: 409 });
  }

  const check = checkPreBookingMessage(parsed.data.body);
  if (!check.allowed) {
    return NextResponse.json({ error: "off_platform_contact_blocked", reason: check.reason, warning: OFF_PLATFORM_WARNING }, { status: 422 });
  }

  const db = getDb();
  const [conversation] = await db.insert(jobConversations).values({
    jobRequestId: id,
    businessId: parsed.data.businessId
  }).onConflictDoUpdate({
    target: [jobConversations.jobRequestId, jobConversations.businessId],
    set: { businessId: parsed.data.businessId }
  }).returning();

  const [message] = await db.insert(jobMessages).values({
    conversationId: conversation.id,
    senderUserId: user.id,
    body: parsed.data.body
  }).returning();

  return NextResponse.json({ message, warning: OFF_PLATFORM_WARNING });
}