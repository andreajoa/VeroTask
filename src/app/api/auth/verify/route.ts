import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/signin?error=missing-token", request.url));

  const result = await consumeMagicLink(token);
  if (!result) return NextResponse.redirect(new URL("/signin?error=expired-link", request.url));

  return NextResponse.redirect(new URL(result.redirectPath, request.url));
}
