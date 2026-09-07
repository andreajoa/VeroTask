import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateLocalStorageRequest } from "@/lib/local-storage";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function PUT(request: Request) {
  const access = validateLocalStorageRequest(request);
  if (!access) return Response.json({ error: "invalid_upload_link" }, { status: 403 });
  if (request.headers.get("content-type") !== access.contentType || !["image/jpeg", "image/png", "image/webp"].includes(access.contentType)) return Response.json({ error: "invalid_image_type" }, { status: 415 });
  const limit = 10 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) return new Response(null, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); return new Response(null, { status: 413 }); }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  const valid = access.contentType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : access.contentType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) return Response.json({ error: "invalid_image" }, { status: 415 });
  await mkdir(path.dirname(access.file), { recursive: true, mode: 0o700 });
  try { await writeFile(access.file, bytes, { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return new Response(null, { status: 409 }); throw error; }
  return new Response(null, { status: 201, headers });
}

export async function GET(request: Request) {
  const access = validateLocalStorageRequest(request);
  if (!access) return new Response(null, { status: 403, headers });
  try {
    const bytes = await readFile(access.file);
    const contentType = access.file.endsWith(".png") ? "image/png" : access.file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": contentType } });
  } catch { return new Response(null, { status: 404, headers }); }
}
