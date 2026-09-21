import type { Metadata } from "next";
import { HowItWorksPage } from "@/components/how-it-works-page";

export const metadata: Metadata = {
  title: "How VeroTask Works",
  description: "See how VeroTask matches customers and professionals, handles acceptance before the booking fee, verifies work, manages protection and supports bilateral ratings while service payment stays directly between customer and professional.",
  alternates: {
    canonical: "/how-it-works",
    languages: { "en-US": "/how-it-works", "pt-BR": "/pt-br/how-it-works", "es-US": "/es/how-it-works", "x-default": "/how-it-works" }
  },
  openGraph: {
    title: "How VeroTask Works",
    description: "From a clear local-service request to verified completion in Orlando and Central Florida.",
    locale: "en_US",
    alternateLocale: ["pt_BR", "es_US"]
  }
};

export default function Page() {
  return <HowItWorksPage locale="en" />;
}
