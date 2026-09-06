"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";

export function FavoriteProviderButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(`/api/favorites/${businessId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { favorited?: boolean }) => setFavorited(Boolean(data.favorited)))
      .catch(() => undefined);
  }, [businessId]);

  async function toggle() {
    setBusy(true);
    const response = await fetch(`/api/favorites/${businessId}`, { method: favorited ? "DELETE" : "POST" });
    if (response.status === 401) {
      router.push(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const data = await response.json() as { favorited?: boolean };
    if (response.ok) setFavorited(Boolean(data.favorited));
    setBusy(false);
  }

  return <button type="button" disabled={busy} onClick={() => void toggle()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60"><Heart size={17} fill={favorited ? "currentColor" : "none"} /> {favorited ? "Saved" : "Save provider"}</button>;
}