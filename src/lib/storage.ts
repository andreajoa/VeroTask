import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function storageConfig() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function clientFor(config: NonNullable<ReturnType<typeof storageConfig>>) {
  return new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
}

export function evidenceStorageReady() {
  return Boolean(storageConfig());
}

export function isEvidenceObjectRef(value: string) {
  return /^r2:\/\/booking-evidence\/[0-9a-f-]+\/(before|after)\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(value);
}

function keyFromObjectRef(objectRef: string) {
  if (!isEvidenceObjectRef(objectRef)) throw new Error("invalid_evidence_object_ref");
  return objectRef.slice("r2://".length);
}

export async function createEvidenceUpload(input: {
  bookingId: string;
  kind: "before" | "after";
  contentType: "image/jpeg" | "image/png" | "image/webp";
}) {
  const config = storageConfig();
  if (!config) throw new Error("storage_not_configured");

  const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
  const key = `booking-evidence/${input.bookingId}/${input.kind}/${randomUUID()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: input.contentType,
    CacheControl: "private, max-age=0, no-store",
    Metadata: { bookingId: input.bookingId, evidenceKind: input.kind }
  });
  const uploadUrl = await getSignedUrl(clientFor(config), command, { expiresIn: 10 * 60 });
  return { uploadUrl, objectRef: `r2://${key}` };
}

export async function createEvidenceDownload(objectRef: string) {
  const config = storageConfig();
  if (!config) throw new Error("storage_not_configured");
  const key = keyFromObjectRef(objectRef);
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(clientFor(config), command, { expiresIn: 5 * 60 });
}
