/** Keep token-store failures distinct from email-provider delivery failures. */
export type SignInErrorCode = "rate-limited" | "auth-unavailable" | "email-unavailable" | "invalid-email";

export function classifyMagicLinkCreationError(error: unknown): SignInErrorCode {
  return error instanceof Error && error.message === "auth_rate_limited" ? "rate-limited" : "auth-unavailable";
}

export function signInErrorMessage(error?: string): string | null {
  if (error === "rate-limited") return "Too many sign-in links were requested for this email. Please wait a few minutes and try again.";
  if (error === "auth-unavailable") return "Sign-in is currently unavailable because the account service is offline. No sign-in email was sent. Please try again when service is restored.";
  if (error === "email-unavailable") return "The sign-in link was created, but we could not send the email. Please try again later.";
  if (error) return "We could not process that sign-in request. Please check your email and try again.";
  return null;
}
