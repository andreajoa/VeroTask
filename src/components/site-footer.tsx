import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { localePath, type PublicLocale } from "@/lib/site-copy";
import { VEROTASK_TAGLINE } from "@/lib/brand";

export function SiteFooter({ locale = "en" }: { locale?: PublicLocale }) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return (
    <footer className="border-t border-[var(--line)] bg-white py-12">
      <div className="container-shell grid gap-10 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div>
          <Link href={localePath(locale, "/")} className="inline-flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-strong)] text-sky-200"><BadgeCheck size={20} /></span>VeroTask</Link>
          <p className="mt-4 max-w-sm text-sm font-black text-[var(--brand-strong)]">{VEROTASK_TAGLINE}</p><p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Trusted local services with a separate VeroTask booking fee, evidence-backed completion, customer protection and a clearer record when something goes wrong.</p>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Providers are independent businesses or professionals. Customers pay the service price directly to the professional.</p>
        </div>
        <div><h3 className="text-sm font-black">Customers</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/services")}>Find my Pro</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/how-it-works")}>How it works</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/protection")}>Booking protection</Link><Link className="block hover:text-[var(--brand)]" href="/dashboard/bookings">My bookings</Link></div></div>
        <div><h3 className="text-sm font-black">Providers</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/providers")}>For providers</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/providers/join")}>Join as a Pro</Link><Link className="block hover:text-[var(--brand)]" href="/dashboard">Provider dashboard</Link><Link className="block hover:text-[var(--brand)]" href={`${localePath(locale, "/providers")}#plans`}>Optional plans</Link></div></div>
        <div><h3 className="text-sm font-black">Company</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><Link className="block hover:text-[var(--brand)]" href="/support">Support</Link><Link className="block hover:text-[var(--brand)]" href="/security">Security</Link><Link className="block hover:text-[var(--brand)]" href="/accessibility">Accessibility</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/privacy")}>Privacy</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/terms")}>Terms</Link></div></div>
        <div><h3 className="text-sm font-black">Privacy & safety</h3><div className="mt-4 space-y-2 text-sm text-[var(--muted)]"><CookiePreferencesButton /><Link className="block hover:text-[var(--brand)]" href="/security">Account safety</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/privacy")}>Data practices</Link><Link className="block hover:text-[var(--brand)]" href={localePath(locale, "/protection")}>Disputes & refunds</Link>{supportEmail ? <a className="block hover:text-[var(--brand)]" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <Link className="block hover:text-[var(--brand)]" href="/support">Support contact</Link>}</div></div>
      </div>
      <div className="container-shell mt-10 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)]"><div className="flex flex-wrap items-center justify-between gap-3"><span>© {new Date().getFullYear()} VeroTask. All rights reserved.</span><span>Orlando & Central Florida · United States</span></div></div>
    </footer>
  );
}
