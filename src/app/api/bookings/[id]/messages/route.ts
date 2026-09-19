import { NextRequest, NextResponse } from "next/server";

function disabled() {
  return NextResponse.json({
    error: "direct_messaging_disabled",
    message: "VeroTask uses structured request, quote and booking steps instead of free-form direct messaging."
  }, { status: 410 });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  return disabled();
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  return disabled();
}
