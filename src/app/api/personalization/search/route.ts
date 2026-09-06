import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateAnonymousPersonalizationId, recordMarketplaceSearch } from "@/lib/personalization";

const schema = z.object({
  query: z.string().trim().min(2).max(280),
  location: z.string().trim().max(180).optional().nullable(),
  projectSize: z.string().max(40).optional().nullable(),
  timeline: z.string().max(40).optional().nullable(),
  specificDate: z.string().max(32).optional().nullable(),
  details: z.string().trim().max(4000).optional().nullable(),
  source: z.string().max(40).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_search" }, { status: 400 });

  const [user, anonymousId] = await Promise.all([
    getCurrentUser(),
    getOrCreateAnonymousPersonalizationId()
  ]);

  await recordMarketplaceSearch({
    userId: user?.id,
    anonymousId,
    ...parsed.data
  });

  return NextResponse.json({ ok: true });
}
