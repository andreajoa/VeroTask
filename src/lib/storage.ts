import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function storageConfig() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const publicUrl = process.env.STORAGE_PUBLIC_URL;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) return null;
  return { endpoint, bucket, accessKeyId, secretAccessKey, publicUrl: publicUrl.replace(/\/$/, "") };
}

export function evidenceStorageReady() {
  return Boolean(storageConfig());
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
  const client = new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: input.contentType,
    CacheControl: "private, max-age=0, no-store"
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 10 * 60 });
  return { uploadUrl, objectUrl: `${config.publicUrl}/${key}`, key };
}
