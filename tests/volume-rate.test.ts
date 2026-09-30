import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { calculateBookingAmounts } from "../src/lib/plans";
import { applyVolumeRate, emailHash, verifyVolumeRateCode, volumeRateFor } from "../src/lib/volume-rate";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const other = generateKeyPairSync("ed25519");

function code(payload: object, key = privateKey) {
  const body = Buffer.from(JSON.stringify(payload));
  return `${body.toString("base64url")}.${sign(null, body, key).toString("base64url")}`;
}

const good = { i: "vr1", e: emailHash("Owner@Rentals.com "), o: 2500, u: "2027-03-31" };

test("a signed code for the customer's email is accepted, case and spaces ignored", () => {
  const rate = volumeRateFor(code(good), "owner@rentals.com", new Date("2026-12-01T12:00:00Z"), publicKey);
  assert.deepEqual(rate, { id: "vr1", emailHash: good.e, offBps: 2500, until: "2027-03-31" });
});

test("a code cannot be used by another customer, after it expires, or when forged", () => {
  assert.equal(volumeRateFor(code(good), "someone@else.com", new Date("2026-12-01"), publicKey), null);
  assert.equal(volumeRateFor(code(good), "owner@rentals.com", new Date("2027-04-01T00:00:01Z"), publicKey), null);
  assert.equal(verifyVolumeRateCode(code(good, other.privateKey), publicKey), null);
  const [body, sig] = code(good).split(".");
  const tampered = Buffer.from(JSON.stringify({ ...good, o: 5000 })).toString("base64url");
  assert.equal(verifyVolumeRateCode(`${tampered}.${sig}`, publicKey), null);
  assert.equal(verifyVolumeRateCode(`${body}`, publicKey), null);
  assert.equal(verifyVolumeRateCode(code({ ...good, o: 9000 }), publicKey), null);   // over the cap
  assert.equal(verifyVolumeRateCode(null, publicKey), null);
});

test("the rate lowers only the booking fee; the provider amount is untouched", () => {
  const base = calculateBookingAmounts(20_000, "free");           // $200 job, 15% fee = $30
  const rated = applyVolumeRate(base, 2500);                      // 25% off the fee
  assert.equal(base.marketplaceFeeCents, 3000);
  assert.equal(rated.marketplaceFeeCents, 2250);
  assert.equal(rated.commissionBps, 1125);
  assert.equal(rated.providerAmountCents, base.providerAmountCents);
  assert.equal(rated.totalCents, base.totalCents);
  assert.deepEqual(applyVolumeRate(base, 0), base);
});
