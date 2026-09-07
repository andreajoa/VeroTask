import { chromium } from "playwright-core";
import { Pool } from "pg";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

if (process.env.LOCAL_EMAIL !== "true" || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error("Requires isolated local database and Mailpit");
const base = "http://localhost:3046";
const directory = ".local/journey";
const { businessId } = JSON.parse(await fs.readFile(`${directory}/accounts.json`, "utf8"));
const db = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const original = (await db.query("select b.* from businesses b join users u on u.id=b.owner_user_id where b.id=$1 and u.email='provider@verotask-qa.test'", [businessId])).rows[0];
assert(original && original.name.startsWith("VeroTask QA"));
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const report = { checks: [], fixture: "Temporarily eligible local QA profile; no real Stripe verification or payment", failure: null };
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
let changed = false;
async function account(role) {
  const context = await browser.newContext({ storageState: `${directory}/${role}-session.json`, viewport: { width: 1280, height: 900 } });
  await context.route("**/api/stripe/**", route => route.fulfill({ status: 409, contentType: "application/json", body: '{"error":"local_test_no_stripe_mutation"}' }));
  await context.route("**/api/bookings/*/payment-session", route => route.fulfill({ status: 409, contentType: "application/json", body: '{"error":"local_test_no_payment"}' }));
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  return page;
}
async function visit(page, path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  assert(response.status() < 400, `HTTP ${response.status()} at ${path}`);
}
try {
  const customer = await account("customer");
  const provider = await account("provider");
  await visit(customer, "/dashboard/profile");
  await customer.getByLabel("Full name", { exact: true }).fill("VeroTask QA Customer");
  await customer.getByLabel("Phone", { exact: true }).fill("407-555-0102");
  await customer.locator('[name="marketingConsent"]').check();
  await customer.getByRole("button", { name: "Save profile" }).click();
  await customer.getByRole("status").waitFor();
  check("Customer profile and email preferences saved through browser");
  await visit(provider, `/dashboard/providers/${businessId}/services`);
  if (!(await provider.getByRole("heading", { name: "QA furniture assembly", exact: true }).count())) {
    await provider.getByLabel("Category", { exact: true }).selectOption({ label: "Furniture Assembly" });
    await provider.getByLabel("Service name", { exact: true }).fill("QA furniture assembly");
    await provider.getByLabel("Description", { exact: true }).fill("Local QA service for one small desk assembly. Simulated service only.");
    await provider.locator('[name="price"]').fill("85.00");
    await provider.getByLabel("Minutes", { exact: true }).fill("60");
    await provider.getByRole("button", { name: "Add service", exact: true }).click();
    await provider.waitForURL("**/services?notice=created");
  }
  check("Professional creates fixed-price service through browser");
  await visit(provider, `/dashboard/providers/${businessId}/availability`);
  for (let day=0; day<7; day++) await provider.locator(`[name="active-${day}"]`).check();
  await provider.getByRole("button", { name: "Save working hours" }).click();
  await provider.waitForURL("**/availability?notice=saved");
  check("Professional saves weekly working hours");
  const service = (await db.query("select id from services where business_id=$1 and name='QA furniture assembly' limit 1", [businessId])).rows[0];
  const date = new Date(Date.now()+4*86400000).toISOString().slice(0,10)+"T10:00";
  const pending = await customer.request.post(`${base}/api/bookings/checkout`, { data: { businessId, serviceId: service.id, scheduledLocal: date, serviceAddress: "400 South Orange Avenue, Orlando FL 32801", acceptsPolicy: true } });
  assert.equal(pending.status(),409);
  assert.equal((await pending.json()).error,"provider_not_bookable");
  check("Pending Stripe verification blocks real booking eligibility");

  // Eligibility fixture for exercising the application workflow only. Always restored below.
  await db.query("update businesses set status='active', stripe_payouts_enabled=true, stripe_connect_account_id='acct_local_simulation' where id=$1", [businessId]);
  changed = true;
  await visit(customer, `/book/${original.slug}?service=${service.id}`);
  await customer.locator('[name="scheduledLocal"]').fill(date);
  await customer.locator('[name="serviceAddress"]').fill("400 South Orange Avenue, Orlando FL 32801");
  await customer.locator('[name="customerNotes"]').fill("QA simulation: assemble one desk. No actual visit or payment.");
  await customer.locator('[name="acceptsPolicy"]').check();
  await customer.getByRole("button", { name: "Send booking request" }).click();
  await customer.waitForURL("**/bookings/**?requested=1");
  const bookingId = new URL(customer.url()).pathname.split("/")[2];
  report.bookingId = bookingId;
  let booking = (await db.query("select status,stripe_payment_intent_id from bookings where id=$1", [bookingId])).rows[0];
  assert.equal(booking.status,"requested");
  assert.equal(booking.stripe_payment_intent_id,null);
  assert.equal(await customer.getByRole("button", { name: "Continue to secure payment" }).count(),0);
  check("Customer sends request before payment using local eligibility fixture");
  const denied = await customer.request.post(`${base}/api/bookings/${bookingId}/accept`);
  assert.equal(denied.status(),403);
  check("Customer cannot accept their own request as a professional");
  await visit(provider, `/bookings/${bookingId}`);
  await provider.getByRole("button", { name: "Accept service request" }).click();
  await provider.getByText("Request accepted", { exact: true }).waitFor();
  booking = (await db.query("select status,stripe_payment_intent_id from bookings where id=$1", [bookingId])).rows[0];
  assert.equal(booking.status,"accepted");
  assert.equal(booking.stripe_payment_intent_id,null);
  check("Professional accepts request and payment remains outstanding");
  await visit(customer, `/bookings/${bookingId}`);
  await customer.getByRole("button", { name: "Continue to secure payment" }).waitFor();
  check("Customer sees payment entry only after acceptance");
  await customer.getByPlaceholder("Write a message about this service…").fill("QA: please confirm the desk assembly details.");
  await customer.getByRole("button", { name: "Send", exact: true }).click();
  await visit(provider, `/bookings/${bookingId}`);
  await provider.getByText("QA: please confirm the desk assembly details.", { exact: true }).waitFor();
  check("Private customer message appears for the professional");
  await customer.screenshot({ path: `${directory}/customer-accepted-booking.png`, caret:"initial", timeout:90000 });
} catch(error) {
  report.failure=error.message;
  console.error(error.message);
  process.exitCode=1;
} finally {
  if(changed) await db.query("update businesses set status=$2, stripe_payouts_enabled=$3, stripe_connect_account_id=$4 where id=$1", [businessId, original.status, original.stripe_payouts_enabled, original.stripe_connect_account_id]);
  await browser.close();
  await db.end();
  await fs.writeFile(`${directory}/booking-report.json`, JSON.stringify(report,null,2), {mode:0o600});
}
