"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Consent = { analytics: boolean; marketing: boolean };
const STORAGE_KEY = "verotask_consent_v1";

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

function sendEvent(payload: Record<string, unknown>, useBeacon = false) {
  const body = JSON.stringify(payload);
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/collect", blob);
    return;
  }
  void fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: useBeacon
  }).catch(() => undefined);
}

function pagePayload(consent: Consent) {
  return {
    eventType: "page_view",
    path: `${window.location.pathname}${window.location.search}`,
    title: document.title,
    referrer: document.referrer,
    clientOccurredAt: new Date().toISOString(),
    metadata: {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language
    },
    consent
  };
}

export function PrivacyAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const activeSince = useRef<number | null>(null);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !consent?.analytics) return;
    const path = `${window.location.pathname}${window.location.search}`;
    if (lastPath.current === path) return;
    lastPath.current = path;
    sendEvent(pagePayload(consent));
  }, [pathname, consent, ready]);

  useEffect(() => {
    if (!ready || !consent?.analytics) return;

    const setActive = () => {
      if (document.visibilityState === "visible" && activeSince.current === null) activeSince.current = Date.now();
      if (document.visibilityState !== "visible" && activeSince.current !== null) flushActive(true);
    };

    const flushActive = (beacon = false) => {
      if (activeSince.current === null) return;
      const delta = Math.min(60, Math.max(1, Math.round((Date.now() - activeSince.current) / 1000)));
      activeSince.current = document.visibilityState === "visible" ? Date.now() : null;
      sendEvent({
        eventType: "heartbeat",
        path: window.location.pathname,
        clientOccurredAt: new Date().toISOString(),
        activeDeltaSeconds: delta,
        consent
      }, beacon);
    };

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a,button,[role='button'],input[type='submit']") as HTMLElement | null;
      if (!target) return;
      const anchor = target instanceof HTMLAnchorElement ? target : null;
      sendEvent({
        eventType: "click",
        path: window.location.pathname,
        clientOccurredAt: new Date().toISOString(),
        elementTag: target.tagName.toLowerCase(),
        elementRole: target.getAttribute("role") || undefined,
        elementLabel: target.getAttribute("data-analytics-id") || target.getAttribute("aria-label") || target.textContent?.replace(/\s+/g, " ").trim().slice(0, 160),
        targetPath: anchor?.href,
        metadata: { cta: target.getAttribute("data-analytics-id") || undefined },
        consent
      });
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const denominator = Math.max(1, doc.scrollHeight - window.innerHeight);
      const depth = Math.round((window.scrollY / denominator) * 100);
      if ([25, 50, 75, 90].some((mark) => Math.abs(depth - mark) <= 1)) {
        sendEvent({
          eventType: "scroll_depth",
          path: window.location.pathname,
          clientOccurredAt: new Date().toISOString(),
          metadata: { scrollDepth: depth },
          consent
        });
      }
    };

    activeSince.current = document.visibilityState === "visible" ? Date.now() : null;
    const timer = window.setInterval(() => flushActive(false), 15_000);
    document.addEventListener("visibilitychange", setActive);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", () => flushActive(true));

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", setActive);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      flushActive(true);
    };
  }, [consent, ready]);

  function save(next: Consent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConsent(next);
    sendEvent({
      eventType: "consent_updated",
      path: window.location.pathname,
      clientOccurredAt: new Date().toISOString(),
      metadata: { source: "privacy_banner" },
      consent: next
    });
  }

  if (!ready || consent) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="font-black text-slate-950">Privacy choices</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">VeroTask uses essential security records for bookings and disputes. With your permission, analytics records page usage, clicks and active time to improve the marketplace. Marketing permission controls promotional emails. We never record passwords, card numbers, CVV or typed form contents.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button onClick={() => save({ analytics: false, marketing: false })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700">Essential only</button>
          <button onClick={() => save({ analytics: true, marketing: false })} className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-black text-emerald-700">Allow analytics</button>
          <button onClick={() => save({ analytics: true, marketing: true })} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Allow analytics + offers</button>
        </div>
      </div>
    </div>
  );
}
