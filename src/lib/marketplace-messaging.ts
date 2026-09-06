const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+?1[\s().-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}\b/;
const PAYMENT_OR_CONTACT_APP = /\b(zelle|venmo|cash\s*app|cashapp|paypal|whats?app|telegram|signal)\b/i;
const OFF_PLATFORM_PHRASE = /\b(text me|call me|message me at|pay me directly|pay outside|outside the platform|off platform)\b/i;

export type MarketplaceMessageCheck = {
  allowed: boolean;
  reason?: "email" | "phone" | "external_payment_or_messaging" | "off_platform_request";
};

export function checkPreBookingMessage(body: string): MarketplaceMessageCheck {
  if (EMAIL.test(body)) return { allowed: false, reason: "email" };
  if (PHONE.test(body)) return { allowed: false, reason: "phone" };
  if (PAYMENT_OR_CONTACT_APP.test(body)) return { allowed: false, reason: "external_payment_or_messaging" };
  if (OFF_PLATFORM_PHRASE.test(body)) return { allowed: false, reason: "off_platform_request" };
  return { allowed: true };
}

export const OFF_PLATFORM_WARNING =
  "Keep communication and payment on VeroTask before booking. Off-platform arrangements are not covered by Vero Protect, VeroTask dispute support or booking records.";
