export const SESSION_COOKIE = "verotask_session";
export const SESSION_DAYS = 30;

const PRODUCTION_COOKIE_DOMAIN = ".verotask.online";

export function sessionCookieOptions(expiresAt: Date, production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    ...(production ? { domain: PRODUCTION_COOKIE_DOMAIN } : {})
  };
}

export function clearSessionCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    ...(production ? { domain: PRODUCTION_COOKIE_DOMAIN } : {})
  };
}
