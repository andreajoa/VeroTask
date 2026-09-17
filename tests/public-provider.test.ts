import test from "node:test";
import assert from "node:assert/strict";
import { publicProviderId, publicProviderName, publicProviderSlug, publicServiceText } from "../src/lib/public-provider";

test("public profile URLs use opaque IDs and reject malformed input", () => {
  const id = "663bcd18-953f-42a2-a09b-19a3345357bb";
  assert.equal(publicProviderId(publicProviderSlug(id)), id);
  assert.equal(publicProviderId("acme-cleaning-orlando"), null);
  assert.equal(publicProviderId("pro-not-a-uuid"), null);
  assert.equal(publicProviderId(`${publicProviderSlug(id)}/../admin`), null);
  assert.match(publicProviderName(id, "en"), /^Professional VT-/);
});

test("public service copy removes identifiable names and direct contact channels", () => {
  const privateName = "Acme (Home) + Care";
  const text = publicServiceText(`${privateName}: Deep cleaning. Email owner@acme.com, phone +1 (407) 555-1212. https://acme.com/contact www.acme.net acme.org @acme_home`, privateName);
  assert.match(text, /Deep cleaning/);
  assert.doesNotMatch(text, /Acme|owner@|555-1212|https:|www\.|\.org|@acme/i);
  assert.equal(publicServiceText(null, privateName), "Local service");
});
