import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 1 });
const account = await stripe.accounts.retrieve(null);
const specification = await stripe.countrySpecs.retrieve(account.country);
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
console.log(JSON.stringify({
  country: account.country,
  live: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"),
  chargesEnabled: account.charges_enabled,
  payoutsEnabled: account.payouts_enabled,
  transfersToUSSupported: specification.supported_transfer_countries.includes("US"),
  transfersToBRSupported: specification.supported_transfer_countries.includes("BR"),
  verotaskWebhooks: endpoints.data.filter(item => /verotask/i.test(item.url)).map(item => ({ id: item.id, url: item.url, status: item.status, connect: item.application !== null, events: item.enabled_events })),
  moreWebhookPages: endpoints.has_more
}, null, 2));
