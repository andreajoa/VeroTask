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

let eventQueue = Promise.resolve();

function sendEvent(payload: Record<string, unknown>, useBeacon = false) {
  const body = JSON.stringify(payload);
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/collect", blob);
    return;
  }
  eventQueue = eventQueue.then(async () => { await fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: useBeacon
  }); }).catch(() => undefined);
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
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/api/auth");
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const activeSince = useRef<number | null>(null);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setConsent(readConsent()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (isAdminPath || !consent?.analytics) return;
    const path = `${window.location.pathname}${window.location.search}`;
    if (lastPath.current === path) return;
    lastPath.current = path;
    sendEvent(pagePayload(consent));
  }, [pathname, consent, isAdminPath]);

  useEffect(() => {
    if (isAdminPath || !consent?.analytics) return;

    const pagePath = window.location.pathname;
    const scrollMarks = new Set<number>();
    const flushActive = (beacon = false) => {
      if (activeSince.current === null) return;
      const delta = Math.min(60, Math.max(0, Math.round((Date.now() - activeSince.current) / 1000)));
      activeSince.current = document.visibilityState === "visible" ? Date.now() : null;
      if (!delta) return;
      sendEvent({
        eventType: "heartbeat",
        path: pagePath,
        clientOccurredAt: new Date().toISOString(),
        activeDeltaSeconds: delta,
        consent
      }, beacon);
    };

    const setActive = () => {
      if (document.visibilityState === "visible" && activeSince.current === null) activeSince.current = Date.now();
      if (document.visibilityState !== "visible" && activeSince.current !== null) flushActive(true);
    };

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a,button,[role='button'],input[type='submit']") as HTMLElement | null;
      if (!target) return;
      const anchor = target instanceof HTMLAnchorElement ? target : null;
      sendEvent({
        eventType: "click",
        path: pagePath,
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
      for (const mark of [25, 50, 75, 90, 100]) {
        if (depth < mark || scrollMarks.has(mark)) continue;
        scrollMarks.add(mark);
        sendEvent({ eventType: "scroll_depth", path: pagePath, clientOccurredAt: new Date().toISOString(), metadata: { scrollDepth: mark }, consent });
      }
    };

    const onPageHide = () => flushActive(true);
    activeSince.current = document.visibilityState === "visible" ? Date.now() : null;
    const timer = window.setInterval(() => flushActive(false), 15_000);
    document.addEventListener("visibilitychange", setActive);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", setActive);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      flushActive(true);
    };
  }, [consent, isAdminPath, pathname]);

  function save(next: Consent) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Session-only preference when storage is disabled. */ }
    setConsent(next);
    sendEvent({
      eventType: "consent_updated",
      path: window.location.pathname,
      clientOccurredAt: new Date().toISOString(),
      metadata: { source: "privacy_banner" },
      consent: next
    });
  }

  if (isAdminPath || consent === undefined || consent) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="font-black text-slate-950">Privacy choices</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">Choose whether to share visits, clicks and active time, or receive offers. Essential security stays on. Payment details and form contents are never tracked.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button onClick={() => save({ analytics: false, marketing: false })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700">Essential only</button>
          <button onClick={() => save({ analytics: true, marketing: false })} className="rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-black text-[var(--brand)]">Allow analytics</button>
          <button onClick={() => save({ analytics: true, marketing: true })} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-black text-white">Allow analytics + offers</button>
        </div>
      </div>
    </div>
  );
}
