import Link from "next/link";
import { Accessibility, BadgeCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white"><div className="container-shell flex min-h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand)] text-white"><BadgeCheck size={20} /></span>VeroTask</Link><Link href="/support" className="text-sm font-black text-[var(--brand)]">Support</Link></div></header>
      <section className="container-shell py-14"><article className="mx-auto max-w-3xl"><div className="badge bg-[var(--brand-soft)] text-[var(--brand)]"><Accessibility size={15} /> Accessibility</div><h1 className="mt-5 text-4xl font-black tracking-tight">Accessibility at VeroTask</h1><p className="mt-4 text-lg leading-8 text-[var(--muted)]">VeroTask aims to make its marketplace usable with keyboard navigation, screen readers, zoom, readable contrast and clear status messaging. Accessibility is treated as an ongoing product requirement rather than a one-time checklist.</p><div className="mt-8 space-y-4"><section className="card p-6"><h2 className="font-black">What we design for</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]"><li>Keyboard-accessible navigation and controls.</li><li>Visible focus states and descriptive labels.</li><li>Semantic headings, forms and status information.</li><li>Readable contrast and responsive layouts.</li><li>Text alternatives or context for meaningful visual content.</li></ul></section><section className="card p-6"><h2 className="font-black">Report an accessibility barrier</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">If you cannot complete a task because of an accessibility issue, email <a href="mailto:support@verotask.com" className="font-black text-[var(--brand)]">support@verotask.com</a> with the page, device/browser and a short description of the barrier. We will use that information to investigate the issue.</p></section></div></article></section>
      <SiteFooter />
    </main>
  );
}
