"use client";

export function CookiePreferencesButton({ label = "Cookie preferences" }: { label?: string }) {
  return <button onClick={() => { localStorage.removeItem("verotask_consent_v1"); window.location.reload(); }} className="text-left hover:text-[var(--brand)]">{label}</button>;
}
