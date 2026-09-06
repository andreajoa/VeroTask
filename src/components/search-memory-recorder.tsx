"use client";

import { useEffect } from "react";
import type { ServiceSearchParams } from "@/components/services-page";

export function SearchMemoryRecorder({ searchParams }: { searchParams: ServiceSearchParams }) {
  useEffect(() => {
    if (!searchParams.q?.trim()) return;
    const controller = new AbortController();
    void fetch("/api/personalization/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: searchParams.q,
        location: searchParams.location || null,
        projectSize: searchParams.size || null,
        timeline: searchParams.timeline || null,
        specificDate: searchParams.date || null,
        details: searchParams.details || null,
        source: "results_page"
      }),
      keepalive: true,
      signal: controller.signal
    }).catch(() => undefined);
    return () => controller.abort();
  }, [searchParams]);

  return null;
}
