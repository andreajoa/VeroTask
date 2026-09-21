import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFile, stat, unlink } from "node:fs/promises";
import { localStorageEnabled, localObjectPath, signedLocalStorageUrl } from "@/lib/local-storage";
import { contentTypeForEvidenceObjectRef, hasEvidenceImageMagic, MAX_EVIDENCE_IMAGE_BYTES, type EvidenceImageContentType } from "@/lib/evidence-policy";

function storageConfig() {
  const endpoint = process.env.STORAGE_ENDPOINT?.trim();
  const bucket = process.env.STORAGE_BUCKET?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function clientFor(config: NonNullable<ReturnType<typeof storageConfig>>) {
  return new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
}

export function evidenceStorageReady() {
  return localStorageEnabled() || Boolean(storageConfig());
}

export async function verifyEvidenceStorageAccess(): Promise<{ ok: boolean; errorCode: string | null; httpStatusCode: number | null }> {
  if (localStorageEnabled()) return { ok: true, errorCode: null, httpStatusCode: 200 };
  const config = storageConfig();
  if (!config) return { ok: false, errorCode: "storage_not_configured", httpStatusCode: null };
  const client = clientFor(config);
  const probeKey = `.verotask-readiness/${randomUUID()}.txt`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: probeKey,
      Body: "verotask-ready",
      ContentType: "text/plain",
      CacheControl: "private, max-age=0, no-store"
    }));
    const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: probeKey }));
    if (!head.ContentLength) return { ok: false, errorCode: "storage_probe_empty", httpStatusCode: 502 };
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: probeKey }));
    return { ok: true, errorCode: null, httpStatusCode: 200 };
  } catch (error) {
    try { await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: probeKey })); } catch {}
    const candidate = error && typeof error === "object" ? error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } } : null;
    const errorCode = typeof candidate?.name === "string" ? candidate.name.slice(0, 80) : "storage_access_failed";
    const status = candidate?.$metadata?.httpStatusCode;
    return { ok: false, errorCode, httpStatusCode: typeof status === "number" ? status : null };
  }
}

export async function diagnoseEvidenceStorageEndpoints() {
  const config = storageConfig();
  if (!config) return [] as Array<{ kind: string; ok: boolean; errorCode: string | null; httpStatusCode: number | null }>;

  let accountId = "";
  try {
    accountId = new URL(config.endpoint).hostname.split(".")[0] ?? "";
  } catch {}

  const candidates = [
    { kind: "configured", endpoint: config.endpoint },
    ...(accountId ? [
      { kind: "default", endpoint: `https://${accountId}.r2.cloudflarestorage.com` },
      { kind: "us", endpoint: `https://${accountId}.us.r2.cloudflarestorage.com` },
      { kind: "eu", endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com` }
    ] : [])
  ].filter((item, index, all) => all.findIndex(other => other.endpoint === item.endpoint) === index);

  const results: Array<{ kind: string; ok: boolean; errorCode: string | null; httpStatusCode: number | null }> = [];
  for (const candidate of candidates) {
    try {
      await clientFor({ ...config, endpoint: candidate.endpoint }).send(new ListObjectsV2Command({ Bucket: config.bucket, MaxKeys: 1 }));
      results.push({ kind: candidate.kind, ok: true, errorCode: null, httpStatusCode: 200 });
    } catch (error) {
      const value = error && typeof error === "object" ? error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } } : null;
      results.push({
        kind: candidate.kind,
        ok: false,
        errorCode: typeof value?.name === "string" ? value.name.slice(0, 80) : "storage_access_failed",
        httpStatusCode: typeof value?.$metadata?.httpStatusCode === "number" ? value.$metadata.httpStatusCode : null
      });
    }
  }
  return results;
}

export function isEvidenceObjectRef(value: string) {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  return new RegExp(`^r2://booking-evidence/${uuid}/(before|after)/${uuid}\\.(jpg|png|webp)$`, "i").test(value);
}

function keyFromObjectRef(objectRef: string) {
  if (!isEvidenceObjectRef(objectRef)) throw new Error("invalid_evidence_object_ref");
  return objectRef.slice("r2://".length);
}

export async function createEvidenceUpload(input: {
  bookingId: string;
  kind: "before" | "after";
  contentType: EvidenceImageContentType;
  byteSize: number;
}) {
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > MAX_EVIDENCE_IMAGE_BYTES) throw new Error("invalid_evidence_image_size");
  const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
  const key = `booking-evidence/${input.bookingId}/${input.kind}/${randomUUID()}.${extension}`;
  if (localStorageEnabled()) return {
    uploadUrl: signedLocalStorageUrl("PUT", key, input.contentType),
    objectRef: `r2://${key}`,
    requiredHeaders: { "content-type": input.contentType },
    expectedByteSize: input.byteSize
  };
  const config = storageConfig();
  if (!config) throw new Error("storage_not_configured");
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.byteSize,
    IfNoneMatch: "*",
    CacheControl: "private, max-age=0, no-store",
    Metadata: { bookingId: input.bookingId, evidenceKind: input.kind, declaredSize: String(input.byteSize) }
  });
  const uploadUrl = await getSignedUrl(clientFor(config), command, { expiresIn: 10 * 60 });
  return {
    uploadUrl,
    objectRef: `r2://${key}`,
    requiredHeaders: { "content-type": input.contentType, "if-none-match": "*" },
    expectedByteSize: input.byteSize
  };
}

export async function createEvidenceDownload(objectRef: string) {
  const key = keyFromObjectRef(objectRef);
  if (localStorageEnabled()) return signedLocalStorageUrl("GET", key);
  const config = storageConfig();
  if (!config) throw new Error("storage_not_configured");
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(clientFor(config), command, { expiresIn: 5 * 60 });
}

export async function inspectEvidenceObject(objectRef: string): Promise<
  | { ok: true; byteSize: number; contentType: EvidenceImageContentType }
  | { ok: false; reason: string }
> {
  try {
    const key = keyFromObjectRef(objectRef);
    const expectedContentType = contentTypeForEvidenceObjectRef(objectRef);
    if (!expectedContentType) return { ok: false, reason: "unsupported_image_type" };
    if (localStorageEnabled()) {
      const filePath = localObjectPath(key);
      const file = await stat(filePath);
      if (!file.isFile() || file.size <= 0 || file.size > MAX_EVIDENCE_IMAGE_BYTES) return { ok: false, reason: "invalid_image_size" };
      const bytes = await readFile(filePath);
      if (!hasEvidenceImageMagic(bytes.subarray(0, 12), expectedContentType)) return { ok: false, reason: "invalid_image_content" };
      return { ok: true, byteSize: file.size, contentType: expectedContentType };
    }
    const config = storageConfig();
    if (!config) return { ok: false, reason: "storage_not_configured" };
    const client = clientFor(config);
    const object = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    const byteSize = object.ContentLength ?? 0;
    if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > MAX_EVIDENCE_IMAGE_BYTES) return { ok: false, reason: "invalid_image_size" };
    if (object.ContentType !== expectedContentType) return { ok: false, reason: "invalid_image_type" };
    if (object.Metadata?.declaredsize && object.Metadata.declaredsize !== String(byteSize)) return { ok: false, reason: "image_size_mismatch" };
    const sample = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key, Range: "bytes=0-11" }));
    const bytes = sample.Body ? await sample.Body.transformToByteArray() : new Uint8Array();
    if (!hasEvidenceImageMagic(bytes, expectedContentType)) return { ok: false, reason: "invalid_image_content" };
    return { ok: true, byteSize, contentType: expectedContentType };
  } catch {
    return { ok: false, reason: "photo_upload_not_found" };
  }
}

export async function deleteEvidenceObject(objectRef: string) {
  const key = keyFromObjectRef(objectRef);
  if (localStorageEnabled()) {
    try { await unlink(localObjectPath(key)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }
  const config = storageConfig();
  if (!config) throw new Error("storage_not_configured");
  await clientFor(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
