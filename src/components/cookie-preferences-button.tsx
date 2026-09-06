"use client";

export function CookiePreferencesButton() {
  return <button onClick={() => { localStorage.removeItem("verotask_consent_v1"); window.location.reload(); }} className="text-left hover:text-[var(--brand)]">Cookie preferences</button>;
}
