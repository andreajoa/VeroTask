import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "verotask",
    status: "alive",
    timestamp: new Date().toISOString()
  }, { headers: { "cache-control": "no-store" } });
}
