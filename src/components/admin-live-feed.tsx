"use client";

import { useEffect, useState } from "react";
import { Activity, Globe2, MousePointerClick, Radio, UserRound } from "lucide-react";

type LiveData = {
  activeCount: number;
  generatedAt: string;
  sessions: Array<{
    id: string;
    email: string | null;
    city: string | null;
    region: string | null;
    countryCode: string | null;
    deviceCategory: string | null;
    exitPath: string | null;
    activeSeconds: number;
    lastSeenAt: string;
    referrer: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    path: string | null;
    elementLabel: string | null;
    targetPath: string | null;
    occurredAt: string;
    city: string | null;
    region: string | null;
    countryCode: string | null;
  }>;
};

function elapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${seconds % 60}s`;
}

export function AdminLiveFeed() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/live", { cache: "no-store" });
        if (!response.ok) throw new Error("live_unavailable");
        const next = await response.json() as LiveData;
        if (active) { setData(next); setError(false); }
      } catch {
        if (active) setError(true);
      }
    }
    load();
    const timer = window.setInterval(load, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <section className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.035]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <div className="flex items-center gap-2 font-black"><Radio size={18} className="text-emerald-300" /> Live visitor activity</div>
          <p className="mt-1 text-xs text-slate-400">Auto-refreshes every 8 seconds · approximate city-level network location only.</p>
        </div>
        <div className="rounded-full bg-emerald-300/10 px-3 py-1.5 text-sm font-black text-emerald-300">{data?.activeCount ?? 0} active now</div>
      </div>
      {error ? <div className="p-5 text-sm text-amber-200">Live feed is temporarily unavailable. Historical analytics remain available.</div> : (
        <div className="grid gap-0 xl:grid-cols-2">
          <div className="border-b border-white/10 xl:border-b-0 xl:border-r">
            <div className="px-5 pt-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Active sessions</div>
            <div className="mt-2 max-h-[420px] divide-y divide-white/5 overflow-y-auto">
              {(data?.sessions ?? []).map((session) => (
                <a key={session.id} href={`/admin/analytics/${session.id}`} className="grid grid-cols-[1fr_auto] gap-3 p-4 hover:bg-white/[0.025]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold"><UserRound size={14} className="text-emerald-300" />{session.email || "Anonymous visitor"}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400"><span><Globe2 size={12} className="mr-1 inline" />{[session.city, session.region, session.countryCode].filter(Boolean).join(", ") || "Location unavailable"}</span><span>{session.deviceCategory || "unknown"}</span></div>
                    <div className="mt-2 max-w-[620px] truncate text-xs text-slate-300">{session.exitPath || "/"}</div>
                  </div>
                  <div className="text-right text-xs"><div className="font-black text-white">{elapsed(session.activeSeconds)}</div><div className="mt-1 text-slate-500">active</div></div>
                </a>
              ))}
              {!data?.sessions.length && <div className="p-5 text-sm text-slate-400">No consented active sessions in the last 5 minutes.</div>}
            </div>
          </div>
          <div>
            <div className="px-5 pt-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Latest events</div>
            <div className="mt-2 max-h-[420px] divide-y divide-white/5 overflow-y-auto">
              {(data?.events ?? []).map((event) => (
                <div key={event.id} className="p-4">
                  <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-black text-emerald-300"><MousePointerClick size={13} />{event.eventType.replaceAll("_", " ")}</span><span className="text-[10px] text-slate-500">{new Date(event.occurredAt).toLocaleTimeString()}</span></div>
                  <div className="mt-2 truncate text-sm font-bold">{event.elementLabel || event.path || "Event"}</div>
                  <div className="mt-1 truncate text-xs text-slate-400">{event.path || "/"} · {[event.city, event.region, event.countryCode].filter(Boolean).join(", ") || "location unavailable"}</div>
                </div>
              ))}
              {!data?.events.length && <div className="p-5 text-sm text-slate-400">No new consented events in the last 2 minutes.</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
