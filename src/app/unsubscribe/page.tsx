import Link from "next/link";
import { BadgeCheck, MailX } from "lucide-react";

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const query = await searchParams;
  const done = query.status === "done";
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-5 py-12">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">{done ? <MailX size={28} /> : <BadgeCheck size={28} />}</div>
        <h1 className="mt-5 text-2xl font-black">{done ? "You are unsubscribed" : "We could not verify that link"}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{done ? "VeroTask will stop promotional email for this address. Transactional messages about an active booking, payment, security or account may still be sent when necessary." : "The unsubscribe link may be invalid or incomplete. You can contact VeroTask support if you need help with your email preferences."}</p>
        <Link href="/" className="btn-primary mt-6">Return to VeroTask</Link>
      </div>
    </main>
  );
}
