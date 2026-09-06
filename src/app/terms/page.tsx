import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "VeroTask marketplace terms covering providers, bookings, payments, proof of service, cancellations, disputes and reviews.",
  alternates: {
    canonical: "/terms",
    languages: { "en-US": "/terms", "pt-BR": "/pt-br/terms", es: "/es/terms", "x-default": "/terms" }
  }
};

export default function Page() {
  return <LegalPage locale="en" kind="terms" />;
}
