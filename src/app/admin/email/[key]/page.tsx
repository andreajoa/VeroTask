import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { isAdminSession } from "@/lib/admin-auth";
import { getEmailTemplate, renderVeroTaskEmail } from "@/lib/crm-templates";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  if (!await isAdminSession()) redirect("/admin/signin");
  const template = getEmailTemplate((await params).key);
  if (!template) notFound();
  const html = renderVeroTaskEmail({ template, firstName: "Alex", transactional: template.kind === "transactional", unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe` });
  return <AdminShell active="/admin/email"><div className="mx-auto max-w-5xl"><Link href="/admin/email" className="text-sky-300">← Email Center</Link><h1 className="mt-5 text-2xl font-bold">{template.subject}</h1><p className="mt-2 text-slate-400">{template.preview}</p><iframe title="VeroTask email preview" sandbox="allow-popups" srcDoc={html} className="mt-6 h-[1000px] w-full rounded-2xl border border-white/10 bg-white" /></div></AdminShell>;
}
