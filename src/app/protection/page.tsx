import type { Metadata } from "next";
import { ProtectionPage } from "@/components/protection-page";

export const metadata: Metadata = {
  title: "Payment Protection, Cancellations & Disputes",
  description: "Understand VeroTask payment protection, the 24-hour customer review window, proof of service, refunds, cancellations and dispute handling.",
  alternates: {
    canonical: "/protection",
    languages: { "en-US": "/protection", "pt-BR": "/pt-br/protection", "es-US": "/es/protection", "x-default": "/protection" }
  },
  openGraph: {
    title: "VeroTask Booking Protection",
    description: "Booking-fee protection, arrival verification, cancellations and dispute handling for local services.",
    locale: "en_US",
    alternateLocale: ["pt_BR", "es_US"]
  }
};

export default function Page() {
  return <ProtectionPage locale="en" />;
}
