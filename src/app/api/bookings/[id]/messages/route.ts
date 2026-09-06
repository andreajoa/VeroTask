import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvents, conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";

const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

async function context(id: string, userId: string) {
  const access = await bookingAccess(id, userId);
  if (!access?.allowed) return null;
  const db = getDb();
  const [conversation] = await db.select().from(conversations).where(eq(conversations.bookingId, id)).limit(1);
  return { access, db, conversation: conversation ?? null };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ctx = await context(id, user.id);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!ctx.conversation) return NextResponse.json({ messages: [] });

  const rows = await ctx.db.select().from(messages)
    .where(eq(messages.conversationId, ctx.conversation.id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({
    messages: rows.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      senderRole: message.senderUserId === ctx.access.booking.customerId ? "customer" : "provider",
      mine: message.senderUserId === user.id
    }))
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = messageSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  const ctx = await context(id, user.id);
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (["cancelled", "refunded"].includes(ctx.access.booking.status)) {
    return NextResponse.json({ error: "conversation_closed" }, { status: 409 });
  }

  let conversation = ctx.conversation;
  if (!conversation) {
    const [created] = await ctx.db.insert(conversations).values({ bookingId: id })
      .onConflictDoNothing({ target: conversations.bookingId }).returning();
    conversation = created ?? await ctx.db.select().from(conversations).where(eq(conversations.bookingId, id)).limit(1).then((rows) => rows[0]);
  }
  if (!conversation) return NextResponse.json({ error: "conversation_unavailable" }, { status: 500 });

  const [message] = await ctx.db.insert(messages).values({
    conversationId: conversation.id,
    senderUserId: user.id,
    body: parsed.data.body
  }).returning();
  await ctx.db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "message_sent",
    metadata: { messageId: message.id, length: parsed.data.body.length }
  });

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      senderRole: ctx.access.isCustomer ? "customer" : "provider",
      mine: true
    }
  });
}
