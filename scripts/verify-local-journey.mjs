import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.VERIFY_BASE_URL || "http://localhost:3046";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local verification only");
const directory = ".local/journey";
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const report = { startedAt: new Date().toISOString(), checks: [], errors: [], externalPayments: "Not exercised: test credentials required" };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const check = (name, details) => { report.checks.push({ name, passed: true, details }); console.log(`PASS ${name}`); };
async function pageFor() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", error => report.errors.push(error.message));
  // These test profiles must never create accounts or charges on the live Stripe account.
  await page.route("**/api/stripe/**", route => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "external_stripe_not_part_of_local_test" }) }));
  return page;
}
async function visit(page, path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  assert(response.status() < 400, `HTTP ${response.status()} at ${path}`);
  await page.locator("h1").waitFor();
}
async function login(page, email, next = "/dashboard") {
  await visit(page, `/signin?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a secure link" }).click();
  await page.waitForURL("**/signin?sent=1", { timeout: 120000 });
  const inbox = await fetch("http://127.0.0.1:8026/api/v1/messages?limit=100").then(r => r.json());
  const message = inbox.messages.find(item => item.Subject === "Your secure VeroTask sign-in link" && item.To.some(to => to.Address === email));
  assert(message, "Magic link received in Mailpit");
  const content = await fetch(`http://127.0.0.1:8026/api/v1/message/${message.ID}`).then(r => r.json());
  const link = content.HTML.match(/https?:\/\/[^"\s<>]+\/api\/auth\/verify\?token=[a-f0-9]+/)?.[0];
  assert(link, "Magic link found in rendered email");
  await page.goto(link, { waitUntil: "networkidle", timeout: 120000 });
  assert.equal(new URL(page.url()).pathname, next);
  check(`Passwordless ${email.startsWith("provider") ? "provider" : "customer"} login and local email`);
  return link;
}

try {
  const anonymous = await pageFor();
  await visit(anonymous, "/dashboard");
  assert.equal(new URL(anonymous.url()).pathname, "/signin");
  check("Anonymous dashboard access requires authentication");
  await visit(anonymous, "/admin/crm");
  assert.equal(new URL(anonymous.url()).pathname, "/admin/signin");
  check("Anonymous CRM access requires administrator");
  await anonymous.context().close();

  const admin = await pageFor();
  await visit(admin, "/admin/signin");
  await admin.locator('input[name="password"]').fill((await fs.readFile(".local/admin-password.txt", "utf8")).trim());
  await admin.getByRole("button", { name: "Enter Control Center" }).click();
  await admin.waitForURL("**/dashboard", { timeout: 120000 });
  assert(await admin.locator("h1").isVisible());
  check("Administrator password opens owner dashboard");
  await admin.screenshot({ path: `${directory}/admin-dashboard.png`, caret: "initial", timeout: 90000 });

  const customer = await pageFor();
  const link = await login(customer, "customer@verotask-qa.test");
  await customer.context().storageState({ path: `${directory}/customer-session.json` });
  const replay = await pageFor();
  await replay.goto(link, { waitUntil: "domcontentloaded", timeout: 120000 });
  assert.equal(new URL(replay.url()).pathname, "/signin");
  check("Used magic link cannot authenticate another browser");
  await replay.context().close();

  const provider = await pageFor();
  await login(provider, "provider@verotask-qa.test");
  const existing = provider.getByRole("link", { name: "Stripe verification", exact: true }).first();
  let businessId;
  if (await existing.count()) businessId = (await existing.getAttribute("href")).split("/")[3];
  else {
    await visit(provider, "/providers/join");
    await provider.getByLabel("Business or professional name").fill("VeroTask QA — Local Test Professional");
    await provider.getByLabel("Phone", { exact: true }).fill("407-555-0101");
    await provider.getByLabel("ZIP code", { exact: true }).fill("32801");
    await provider.getByLabel("Primary city").fill("Orlando");
    await provider.getByLabel("Primary service").selectOption("furniture-assembly");
    await provider.getByLabel("What kind of work do you do?").fill("Local test profile for verifying furniture assembly requests. This is a simulated business and does not accept real jobs.");
    await provider.getByRole("button", { name: "Create provider profile" }).click();
    await provider.waitForURL("**/onboarding", { timeout: 120000 });
    businessId = new URL(provider.url()).pathname.split("/")[3];
  }
  await visit(provider, `/dashboard/providers/${businessId}/onboarding`);
  assert(await provider.getByRole("button", { name: "Start Stripe verification" }).isVisible());
  check("Professional profile created and Stripe onboarding entry available", { businessId });
  await provider.context().storageState({ path: `${directory}/provider-session.json` });
  await fs.writeFile(`${directory}/accounts.json`, JSON.stringify({ businessId, customer: "customer@verotask-qa.test", provider: "provider@verotask-qa.test" }, null, 2));
  await provider.screenshot({ path: `${directory}/provider-onboarding.png`, caret: "initial", timeout: 90000 });

  await visit(customer, `/dashboard/providers/${businessId}/services`);
  assert.equal(new URL(customer.url()).pathname, "/dashboard");
  check("Customer cannot access professional service management");

  for (const path of ["/admin/analytics", "/admin/crm", "/admin/email", "/admin/bookings", "/admin/evidence"]) {
    await visit(admin, path);
    assert(await admin.locator("h1").isVisible());
    check(`${path} renders for administrator`);
  }
  const inbox = await fetch("http://127.0.0.1:8026/api/v1/messages?limit=100").then(r => r.json());
  for (const email of ["customer@verotask-qa.test", "provider@verotask-qa.test"]) {
    assert(inbox.messages.some(item => item.Subject !== "Your secure VeroTask sign-in link" && item.To.some(to => to.Address === email)), `Welcome delivered to ${email}`);
  }
  check("Customer and professional receive welcome emails");
  assert.equal(report.errors.length, 0, "No browser execution errors");
} catch (error) {
  report.failure = String(error.message).replace(/token=[a-f0-9]+/g, "token=[redacted]");
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  for (const file of await fs.readdir(directory)) await fs.chmod(`${directory}/${file}`, 0o600);
}
