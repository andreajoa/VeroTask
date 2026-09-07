import { chromium } from "playwright-core";
import { Pool } from "pg";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.VERIFY_BASE_URL || "http://localhost:3046";
const directory = ".local/public-privacy";
await fs.mkdir(directory, { recursive: true });
const db = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const rows = (await db.query("select id,name,slug,public_phone,public_email,website_url from businesses where active=true limit 100")).rows;
await db.end();
assert(rows.length, "Need real database rows to check for identity leaks");
const report = { checkedProfiles: rows.length, checks: [], errors: [] };
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
function assertPrivate(html, path) {
  const lower = html.toLowerCase();
  for (const row of rows) {
    for (const field of ["name", "slug", "public_phone", "public_email", "website_url"]) {
      const value = row[field];
      if (!value || value.length < 5) continue;
      assert(!lower.includes(value.toLowerCase()) && !lower.includes(value.replaceAll("&", "&amp;").toLowerCase()), `Private field ${field} leaked in ${path}`);
    }
  }
  assert(!/href=["']tel:/i.test(html), `Telephone link in ${path}`);
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", error => report.errors.push(error.message));
  const slug = `pro-${rows[0].id}`;
  for (const path of ["/services", "/pt-br/services", "/es/services", `/providers/${slug}`, `/pt-br/providers/${slug}`, `/es/providers/${slug}`, `/providers/${slug}/claim`, "/sitemap.xml"]) {
    const response = await context.request.get(`${base}${path}`, { timeout: 90000 });
    assert.equal(response.status(), 200, path);
    assertPrivate(await response.text(), path);
    check(`${path}: no provider identity or direct contacts in response`);
  }
  const legacy = await context.request.get(`${base}/providers/${rows[0].slug}`, { maxRedirects: 0 });
  assert([307,308].includes(legacy.status()));
  assert(legacy.headers().location.endsWith(`/providers/${slug}`));
  check("Old named profile URL redirects to opaque profile URL");
  await page.goto(`${base}/services`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const consent = page.getByRole("button", { name: "Essential only", exact: true });
  if (await consent.isVisible()) await consent.click();
  const profiles = page.locator('a[href*="/providers/pro-"]');
  assert(await profiles.count() > 0);
  check("Service cards link to anonymous provider profiles");
  await page.screenshot({ path: `${directory}/services-desktop.png`, caret: "initial", timeout: 90000 });
  await profiles.first().click();
  await page.waitForURL(/\/providers\/pro-/);
  await page.getByRole("heading", { level: 1, name: /VT-/ }).waitFor();
  assert.match(await page.locator("h1").textContent(), /VT-/);
  check("Profile navigation displays VeroTask public identity");
  await page.screenshot({ path: `${directory}/profile-desktop.png`, caret: "initial", timeout: 90000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/services`, { waitUntil: "domcontentloaded" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: `${directory}/services-mobile.png`, caret: "initial", timeout: 90000 });
  check("Mobile service list has no horizontal overflow");
  assert.equal(report.errors.length, 0, "No browser execution errors");
} catch (error) {
  report.failure = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
}
