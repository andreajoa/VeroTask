import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const clean = hex.replace("#", "");
  const values = [0, 2, 4].map((offset) => channel(Number.parseInt(clean.slice(offset, offset + 2), 16)));
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function cssVariable(css: string, name: string) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `Expected --${name} to be a six-digit hex color`);
  return match[1];
}

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

test("public CTA color pairs meet WCAG AA normal-text contrast", () => {
  const brand = cssVariable(css, "brand");
  const brandStrong = cssVariable(css, "brand-strong");
  const foreground = cssVariable(css, "foreground");
  const accent = cssVariable(css, "accent");
  const muted = cssVariable(css, "muted");
  const white = "#ffffff";

  assert.ok(contrast(brand, white) >= 4.5, "Primary button white text must contrast with brand background");
  assert.ok(contrast(brandStrong, white) >= 4.5, "Primary hover white text must contrast with strong brand background");
  assert.ok(contrast(foreground, white) >= 4.5, "Secondary button dark text must contrast with white background");
  assert.ok(contrast(accent, white) >= 4.5, "Accent text used on white must meet AA contrast");
  assert.ok(contrast(muted, white) >= 4.5, "Muted body text on white must meet AA contrast");
});

test("global button classes explicitly preserve readable foreground/background pairs", () => {
  assert.match(css, /\.btn-primary\s*\{[\s\S]*?background:\s*var\(--brand\);[\s\S]*?color:\s*#ffffff;/);
  assert.match(css, /\.btn-secondary\s*\{[\s\S]*?background:\s*#ffffff;[\s\S]*?color:\s*#17212b;/);
  assert.match(css, /:where\(a, button, input, select, textarea\):focus-visible/);
});
