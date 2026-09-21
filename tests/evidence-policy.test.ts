import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreateEvidenceUpload,
  canSubmitBookingEvidence,
  contentTypeForEvidenceObjectRef,
  hasEvidenceImageMagic,
  MAX_EVIDENCE_IMAGE_BYTES,
  normalizeEvidenceMetadata
} from "../src/lib/evidence-policy";
import { httpsConnectOrigin } from "../next.config";
import { createEvidenceUpload } from "../src/lib/storage";

test("evidence submission is limited by actor and active booking state", () => {
  assert.equal(canSubmitBookingEvidence({ actor: "provider", status: "scheduled", type: "before_photo" }), true);
  assert.equal(canSubmitBookingEvidence({ actor: "provider", status: "scheduled", type: "after_photo" }), false);
  assert.equal(canSubmitBookingEvidence({ actor: "provider", status: "in_progress", type: "after_photo" }), true);
  assert.equal(canSubmitBookingEvidence({ actor: "provider", status: "in_progress", type: "checklist" }), true);
  assert.equal(canSubmitBookingEvidence({ actor: "customer", status: "in_progress", type: "customer_note" }), true);
  assert.equal(canSubmitBookingEvidence({ actor: "customer", status: "in_progress", type: "provider_note" }), false);
  for (const status of ["provider_completed", "customer_confirmed", "auto_completed", "disputed", "cancelled", "refunded", "paid_out"]) {
    assert.equal(canSubmitBookingEvidence({ actor: "provider", status, type: "checklist" }), false, status);
    assert.equal(canSubmitBookingEvidence({ actor: "customer", status, type: "customer_note" }), false, status);
  }
});

test("photo upload URLs follow the same state restrictions", () => {
  assert.equal(canCreateEvidenceUpload("scheduled", "before"), true);
  assert.equal(canCreateEvidenceUpload("scheduled", "after"), false);
  assert.equal(canCreateEvidenceUpload("in_progress", "before"), true);
  assert.equal(canCreateEvidenceUpload("in_progress", "after"), true);
  assert.equal(canCreateEvidenceUpload("provider_completed", "after"), false);
});

test("checklist completion and verified photo metadata are normalized by the server", () => {
  assert.deepEqual(normalizeEvidenceMetadata("checklist"), { completed: true, source: "provider_action" });
  assert.deepEqual(normalizeEvidenceMetadata("provider_note"), {});
  assert.deepEqual(normalizeEvidenceMetadata("before_photo", { byteSize: 1234, contentType: "image/jpeg" }), {
    verifiedUpload: true,
    byteSize: 1234,
    contentType: "image/jpeg"
  });
});

test("image signatures and object-ref content types are checked", () => {
  assert.equal(hasEvidenceImageMagic(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(hasEvidenceImageMagic(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(hasEvidenceImageMagic(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
  assert.equal(hasEvidenceImageMagic(Buffer.from("not an image"), "image/jpeg"), false);
  assert.equal(contentTypeForEvidenceObjectRef("r2://booking-evidence/a/b/file.webp"), "image/webp");
  assert.equal(contentTypeForEvidenceObjectRef("r2://booking-evidence/a/b/file.exe"), null);
  assert.equal(MAX_EVIDENCE_IMAGE_BYTES, 10 * 1024 * 1024);
});

test("only a credential-free HTTPS storage origin is allowed into connect-src", () => {
  assert.equal(httpsConnectOrigin("https://account.r2.cloudflarestorage.com/path"), "https://account.r2.cloudflarestorage.com");
  assert.equal(httpsConnectOrigin("http://account.r2.cloudflarestorage.com"), null);
  assert.equal(httpsConnectOrigin("https://user:secret@example.com"), null);
  assert.equal(httpsConnectOrigin("not-a-url"), null);
  assert.equal(httpsConnectOrigin(undefined), null);
});

test("R2 upload signatures bind the declared byte length", async () => {
  const keys = ["STORAGE_DRIVER", "STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    delete process.env.STORAGE_DRIVER;
    process.env.STORAGE_ENDPOINT = "https://account.r2.cloudflarestorage.com";
    process.env.STORAGE_BUCKET = "evidence";
    process.env.STORAGE_ACCESS_KEY_ID = "test-access-key";
    process.env.STORAGE_SECRET_ACCESS_KEY = "test-secret-key";
    const upload = await createEvidenceUpload({
      bookingId: "123e4567-e89b-42d3-a456-426614174000",
      kind: "before",
      contentType: "image/png",
      byteSize: 1234
    });
    const url = new URL(upload.uploadUrl);
    assert.match(url.searchParams.get("X-Amz-SignedHeaders") ?? "", /(^|;)content-length(;|$)/);
    assert.equal(url.searchParams.get("x-amz-meta-declaredsize"), "1234");
    assert.equal(upload.expectedByteSize, 1234);
    assert.equal(url.origin, "https://account.r2.cloudflarestorage.com");
    assert.match(url.searchParams.get("X-Amz-SignedHeaders") ?? "", /(^|;)if-none-match(;|$)/);
    assert.deepEqual(upload.requiredHeaders, { "content-type": "image/png", "if-none-match": "*" });
    await assert.rejects(
      createEvidenceUpload({
        bookingId: "123e4567-e89b-42d3-a456-426614174000",
        kind: "before",
        contentType: "image/png",
        byteSize: MAX_EVIDENCE_IMAGE_BYTES + 1
      }),
      /invalid_evidence_image_size/
    );
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
