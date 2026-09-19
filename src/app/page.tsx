import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";
import { ReturningCustomerPrompt } from "@/components/returning-customer-prompt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Services in Orlando, FL",
  description: "Find local professionals serving Orlando and Central Florida. Request quotes, compare local Pros and book through VeroTask.",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "pt-US": "/pt-br",
      "es-US": "/es",
      "x-default": "/"
    }
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["pt_US", "es_US"],
    title: "VeroTask | Local Services in Orlando, FL",
    description: "Local service marketplace for Orlando and Central Florida, United States."
  }
};

export default function Page() {
  return <><HomePage locale="en" /><ReturningCustomerPrompt locale="en" /></>;
}
