import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { businesses, providerProfilePhotos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { deleteProviderPhoto, isProviderPhotoObjectRef, putProviderPhoto, readProviderPhoto } from "@/lib/storage";

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

  // `imageBase64` holds an R2 reference for photos uploaded since D1, inline base64 for older ones.
  let bytes: Buffer;
  try {
    bytes = isProviderPhotoObjectRef(photo.imageBase64)
      ? await readProviderPhoto(photo.imageBase64)
      : Buffer.from(photo.imageBase64, "base64");
  } catch {
    return NextResponse.json({ error: "profile_photo_unavailable" }, { status: 503 });
  }
  return new NextResponse(new Uint8Array(bytes), {
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

  // Bytes go to R2 before anything changes in the database: if storage fails, the current photo
  // stays active. Inline base64 cannot be used here — it exceeds the D1 Worker's 32 KB request cap.
  let objectRef: string;
  try {
    objectRef = await putProviderPhoto(businessId, bytes, file.type);
  } catch {
    return NextResponse.json({ error: "photo_storage_unavailable" }, { status: 503 });
  }

  // One active photo per business is a unique index, so the old one must be retired first; there is
  // no transaction across the Worker, so a failed insert restores it instead.
  const previous = sameActive ? sameActive.id : null;
  await db.update(providerProfilePhotos).set({
    active: false,
    deactivatedAt: now
  }).where(and(
    eq(providerProfilePhotos.businessId, businessId),
    eq(providerProfilePhotos.active, true)
  ));

  let photo: typeof providerProfilePhotos.$inferSelect;
  try {
    [photo] = await db.insert(providerProfilePhotos).values({
      businessId,
      uploadedByUserId: user.id,
      contentType: file.type,
      byteSize: bytes.byteLength,
      sha256,
      imageBase64: objectRef,
      attestedRecent: true,
      active: true
    }).returning();
  } catch (error) {
    if (previous) {
      await db.update(providerProfilePhotos).set({ active: true, deactivatedAt: null })
        .where(eq(providerProfilePhotos.id, previous));
    }
    await deleteProviderPhoto(objectRef).catch(() => undefined);
    throw error;
  }

  return NextResponse.json({
    ok: true,
    photoId: photo.id,
    archivedPreviousPhoto: Boolean(sameActive)
  });
}
