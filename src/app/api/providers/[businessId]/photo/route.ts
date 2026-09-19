import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { businesses, providerProfilePhotos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 900 * 1024;
const MIN_BYTES = 8 * 1024;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const db = getDb();
  const [photo] = await db.select().from(providerProfilePhotos).where(and(
    eq(providerProfilePhotos.businessId, businessId),
    eq(providerProfilePhotos.active, true)
  )).orderBy(desc(providerProfilePhotos.createdAt)).limit(1);

  if (!photo) return NextResponse.json({ error: "profile_photo_not_found" }, { status: 404 });

  const bytes = Buffer.from(photo.imageBase64, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": photo.contentType,
      "content-length": String(bytes.byteLength),
      "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "etag": `"${photo.sha256}"`,
      "x-content-type-options": "nosniff"
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { businessId } = await params;
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business || business.ownerUserId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("photo");
  const attestedRecent = form.get("attestedRecent") === "true";
  if (!(file instanceof File)) return NextResponse.json({ error: "photo_required" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "unsupported_image_type" }, { status: 400 });
  if (file.size < MIN_BYTES) return NextResponse.json({ error: "image_too_small" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  if (!attestedRecent) return NextResponse.json({ error: "recent_photo_attestation_required" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const now = new Date();

  const [sameActive] = await db.select({ id: providerProfilePhotos.id, sha256: providerProfilePhotos.sha256 }).from(providerProfilePhotos).where(and(
    eq(providerProfilePhotos.businessId, businessId),
    eq(providerProfilePhotos.active, true)
  )).limit(1);

  if (sameActive?.sha256 === sha256) {
    return NextResponse.json({ ok: true, photoId: sameActive.id, unchanged: true });
  }

  await db.update(providerProfilePhotos).set({
    active: false,
    deactivatedAt: now
  }).where(and(
    eq(providerProfilePhotos.businessId, businessId),
    eq(providerProfilePhotos.active, true)
  ));

  const [photo] = await db.insert(providerProfilePhotos).values({
    businessId,
    uploadedByUserId: user.id,
    contentType: file.type,
    byteSize: bytes.byteLength,
    sha256,
    imageBase64: bytes.toString("base64"),
    attestedRecent: true,
    active: true
  }).returning();

  return NextResponse.json({
    ok: true,
    photoId: photo.id,
    archivedPreviousPhoto: Boolean(sameActive)
  });
}
