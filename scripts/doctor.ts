import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { getStripe } from "../src/lib/stripe";
import { localEmailEnabled } from "../src/lib/email-delivery";
import { localStorageEnabled } from "../src/lib/local-storage";

async function main() {
  const checks: Record<string, unknown> = {};
  try { await getDb().execute(sql`select 1`); checks.database = "connected"; } catch { checks.database = "unavailable"; }
  checks.checkout = "embedded";
  checks.ai = process.env.AI_PROVIDER || "rules";
  checks.email = localEmailEnabled() ? "local Mailpit" : process.env.RESEND_API_KEY ? "Resend configured" : "not configured";
  checks.admin = Boolean(process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_SESSION_SECRET);
  checks.webhooks = { payments: Boolean(process.env.STRIPE_WEBHOOK_SECRET), connect: Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET), email: Boolean(process.env.RESEND_WEBHOOK_SECRET) };
  checks.storage = localStorageEnabled() ? "local private files" : Boolean(process.env.STORAGE_ENDPOINT && process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY);
  if (process.argv.includes("--stripe")) {
    try {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(null);
      const accounts = await stripe.accounts.list({ limit: 1 });
      checks.stripe = { authenticated: true, country: account.country, chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled, connectAccessible: Boolean(accounts), mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test" };
    } catch (error) { checks.stripe = { authenticated: false, code: (error as { code?: string }).code || "connection_failed" }; }
  }
  console.log(JSON.stringify(checks, null, 2));
}
main().catch(() => { console.error("Configuration check failed"); process.exitCode = 1; });
