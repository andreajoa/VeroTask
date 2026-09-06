import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const chromePath = process.env.SCROLLCRAFT_CHROME || process.env.CHROME_PATH || undefined;
const outputDir = path.resolve("scrollcraft/builds/verotask-marketplace/verification");
await fs.mkdir(outputDir, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  baseURL,
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  screenshots: []
};

function record(name, ok, details = undefined) {
  report.checks.push({ name, ok, details });
  if (!ok) process.exitCode = 1;
}

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  return match ? match.slice(1, 4).map(Number) : null;
}

function luminance([r, g, b]) {
  const channel = [r, g, b].map((value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2];
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function wireErrors(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push({ page: label, text: message.text() });
  });
  page.on("pageerror", (error) => report.pageErrors.push({ page: label, text: error.message }));
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("images.pexels.com")) {
      report.failedRequests.push({ page: label, url, error: request.failure()?.errorText || "request failed" });
    }
  });
}

async function saveShot(page, name, fullPage = false) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  report.screenshots.push(path.relative(process.cwd(), file));
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  record(`${label}: no horizontal overflow`, result.scrollWidth <= result.width + 2, result);
}

async function assertInteractiveContrast(page, label) {
  const results = await page.locator("a,button").evaluateAll((nodes) => nodes
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    })
    .map((node) => {
      const style = getComputedStyle(node);
      let parent = node;
      let background = style.backgroundColor;
      while (parent && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
        parent = parent.parentElement;
        if (parent) background = getComputedStyle(parent).backgroundColor;
      }
      return {
        text: (node.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
        foreground: style.color,
        background,
        backgroundImage: style.backgroundImage,
        fontSize: parseFloat(style.fontSize || "0"),
        fontWeight: parseInt(style.fontWeight || "400", 10)
      };
    }));

  const failures = [];
  for (const item of results) {
    if (!item.text || (item.backgroundImage && item.backgroundImage !== "none")) continue;
    const fg = rgb(item.foreground);
    const bg = rgb(item.background);
    if (!fg || !bg) continue;
    const value = ratio(fg, bg);
    const large = item.fontSize >= 24 || (item.fontSize >= 18.66 && item.fontWeight >= 700);
    const required = large ? 3 : 4.5;
    if (value + 0.01 < required) failures.push({ ...item, ratio: Number(value.toFixed(2)), required });
  }
  record(`${label}: interactive text contrast`, failures.length === 0, failures.slice(0, 20));
}

const browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ["--no-sandbox"] });

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktop.newPage();
  await wireErrors(desktopPage, "desktop-home");
  await desktopPage.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktopPage.waitForTimeout(1200);
  record("home: dedicated Services link", await desktopPage.locator('a[href="/services"]').count() > 0);
  record("home: dedicated How it works link", await desktopPage.locator('a[href="/how-it-works"]').count() > 0);
  record("home: dedicated Protection link", await desktopPage.locator('a[href="/protection"]').count() > 0);
  record("home: dedicated Providers link", await desktopPage.locator('a[href="/providers"]').count() > 0);
  await assertNoHorizontalOverflow(desktopPage, "desktop home");
  await assertInteractiveContrast(desktopPage, "desktop home");

  const scrollHeight = await desktopPage.evaluate(() => document.documentElement.scrollHeight);
  for (const [label, fraction] of [["top", 0], ["quarter", 0.25], ["mid", 0.5], ["three-quarter", 0.75], ["bottom", 1]]) {
    await desktopPage.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.max(0, (scrollHeight - 900) * fraction));
    await desktopPage.waitForTimeout(250);
    await saveShot(desktopPage, `desktop-home-${label}`);
  }

  await desktopPage.evaluate(() => window.scrollTo(0, 0));
  const taskInput = desktopPage.locator('input[placeholder*="service" i], input[placeholder*="need" i]').first();
  if (await taskInput.count()) {
    await taskInput.fill("TV mounting");
    const submit = desktopPage.locator("form button[type=submit]").first();
    if (await submit.count()) await submit.click();
    await desktopPage.waitForTimeout(350);
    const dialogCount = await desktopPage.locator('[role="dialog"]').count();
    const contextualTask = await desktopPage.getByText("TV mounting", { exact: false }).count();
    record("signature move: Brief Builder opens", dialogCount > 0 || contextualTask > 1, { dialogCount, contextualTask });
    await saveShot(desktopPage, "desktop-brief-builder");
  } else {
    record("signature move: Brief Builder input found", false);
  }

  for (const route of ["/how-it-works", "/protection", "/providers"]) {
    const page = await desktop.newPage();
    await wireErrors(page, `desktop-${route}`);
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(250);
    record(`${route}: HTTP success`, Boolean(response && response.status() < 400), response?.status());
    record(`${route}: has H1`, await page.locator("h1").count() === 1);
    await assertNoHorizontalOverflow(page, `desktop ${route}`);
    await assertInteractiveContrast(page, `desktop ${route}`);
    await saveShot(page, `desktop-${route.replaceAll("/", "") || "home"}`, true);
    await page.close();
  }
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  await wireErrors(mobilePage, "mobile-home");
  await mobilePage.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForTimeout(800);
  await assertNoHorizontalOverflow(mobilePage, "mobile home");
  await assertInteractiveContrast(mobilePage, "mobile home");
  const menuButton = mobilePage.getByRole("button", { name: /menu/i }).first();
  if (await menuButton.count()) {
    await menuButton.click();
    await mobilePage.waitForTimeout(200);
    record("mobile: navigation opens", await mobilePage.locator('a[href="/providers"]').count() > 0 && await mobilePage.locator('a[href="/how-it-works"]').count() > 0);
    await saveShot(mobilePage, "mobile-menu");
  } else {
    record("mobile: menu button exists", false);
  }
  await saveShot(mobilePage, "mobile-home-top");
  const mobileHeight = await mobilePage.evaluate(() => document.documentElement.scrollHeight);
  await mobilePage.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.max(0, mobileHeight - 844));
  await mobilePage.waitForTimeout(250);
  await saveShot(mobilePage, "mobile-home-bottom");
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await wireErrors(reducedPage, "reduced-motion");
  await reducedPage.goto(`${baseURL}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await reducedPage.waitForTimeout(700);
  const firstBackground = await reducedPage.locator(".marketplace-hero > div").first().getAttribute("class").catch(() => null);
  record("reduced motion: home remains renderable", await reducedPage.locator("h1").count() > 0, firstBackground);
  await saveShot(reducedPage, "reduced-motion-home");
  await reduced.close();

  record("runtime: no page errors", report.pageErrors.length === 0, report.pageErrors);
  record("runtime: no console errors", report.consoleErrors.length === 0, report.consoleErrors.slice(0, 20));
  record("runtime: no first-party failed requests", report.failedRequests.length === 0, report.failedRequests.slice(0, 20));
} finally {
  await browser.close();
  await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
}

const failed = report.checks.filter((check) => !check.ok);
console.log(JSON.stringify({ total: report.checks.length, failed: failed.length, failures: failed }, null, 2));
if (failed.length) process.exit(1);
