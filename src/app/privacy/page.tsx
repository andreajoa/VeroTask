import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How VeroTask handles account, booking, location, evidence, payment and public business listing information.",
  alternates: {
    canonical: "/privacy",
    languages: { "en-US": "/privacy", "pt-BR": "/pt-br/privacy", es: "/es/privacy", "x-default": "/privacy" }
  }
};

export default function Page() {
  return <LegalPage locale="en" kind="privacy" />;
}
