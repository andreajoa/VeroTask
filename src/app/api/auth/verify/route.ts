import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth";
import { canonicalAppUrl } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/signin?error=missing-token", canonicalAppUrl()));

  const result = await consumeMagicLink(token);
  if (!result) return NextResponse.redirect(new URL("/signin?error=expired-link", canonicalAppUrl()));

  return NextResponse.redirect(new URL(result.redirectPath, canonicalAppUrl()));
}
