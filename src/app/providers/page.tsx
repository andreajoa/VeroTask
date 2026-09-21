import type { Metadata } from "next";
import { ProvidersOverviewPage } from "@/components/providers-overview-page";

export const metadata: Metadata = {
  title: "For Local Service Pros in Orlando, FL",
  description: "Join VeroTask as an independent local professional serving Orlando and Central Florida. Create a profile, receive local requests and send quotes.",
  alternates: {
    canonical: "/providers",
    languages: {
      "en-US": "/providers",
      "pt-BR": "/pt-br/providers",
      "es-US": "/es/providers",
      "x-default": "/providers"
    }
  }
};

export default function Page() {
  return <ProvidersOverviewPage locale="en" />;
}
