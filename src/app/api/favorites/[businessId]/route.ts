import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { favoriteProviders } from "@/db/marketplace-schema";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

async function validate(businessId: string) {
  const db = getDb();
  const [business] = await db.select().from(businesses).where(and(eq(businesses.id, businessId), eq(businesses.active, true))).limit(1);
  return business ?? null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ favorited: false }, { status: 200 });
  const { businessId } = await params;
  const db = getDb();
  const [favorite] = await db.select().from(favoriteProviders).where(and(eq(favoriteProviders.customerId, user.id), eq(favoriteProviders.businessId, businessId))).limit(1);
  return NextResponse.json({ favorited: Boolean(favorite) });
}

export async function POST(_request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { businessId } = await params;
  if (!await validate(businessId)) return NextResponse.json({ error: "provider_not_found" }, { status: 404 });
  const db = getDb();
  await db.insert(favoriteProviders).values({ customerId: user.id, businessId }).onConflictDoNothing({ target: [favoriteProviders.customerId, favoriteProviders.businessId] });
  return NextResponse.json({ favorited: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { businessId } = await params;
  const db = getDb();
  await db.delete(favoriteProviders).where(and(eq(favoriteProviders.customerId, user.id), eq(favoriteProviders.businessId, businessId)));
  return NextResponse.json({ favorited: false });
}