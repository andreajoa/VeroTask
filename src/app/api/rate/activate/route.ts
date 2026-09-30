import { NextRequest, NextResponse } from "next/server";
import { canonicalAppUrl } from "@/lib/app-url";
import { VOLUME_RATE_COOKIE, verifyVolumeRateCode } from "@/lib/volume-rate";

/**
 * Link from the volume-rate email: /api/rate/activate?code=...
 * Only the signature is checked here (the visitor may not be signed in yet); the email binding is checked when a
 * booking is requested, against the signed-in customer. An invalid code sets nothing.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const rate = verifyVolumeRateCode(code);
  const target = new URL(rate ? "/services?volume_rate=active" : "/services?volume_rate=invalid", canonicalAppUrl());
  const response = NextResponse.redirect(target, 303);
  if (rate && code) {
    const until = new Date(`${rate.until}T23:59:59Z`);
    response.cookies.set(VOLUME_RATE_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: until
    });
  }
  return response;
}
