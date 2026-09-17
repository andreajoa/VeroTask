import type { Metadata } from "next";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import { canonicalAppUrl } from "@/lib/app-url";
import "./globals.css";

const verificationOther: Record<string, string> = {};
if (process.env.BING_SITE_VERIFICATION) verificationOther["msvalidate.01"] = process.env.BING_SITE_VERIFICATION;
if (process.env.AHREFS_SITE_VERIFICATION) verificationOther["ahrefs-site-verification"] = process.env.AHREFS_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(canonicalAppUrl()),
  title: {
    default: "VeroTask | Trusted Local Services",
    template: "%s | VeroTask"
  },
  description: "Find trusted local professionals in Orlando and Central Florida with a separate VeroTask booking fee, verified service evidence, transparent disputes and customer reviews.",
  applicationName: "VeroTask",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: Object.keys(verificationOther).length ? verificationOther : undefined
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "pt-BR": "/pt-br",
      "es": "/es",
      "x-default": "/"
    }
  },
  openGraph: {
    type: "website",
    siteName: "VeroTask",
    title: "VeroTask | Trusted Local Services",
    description: "Book local services with clear rules, a separate VeroTask booking fee and verified work."
  },
  twitter: {
    card: "summary_large_image",
    title: "VeroTask | Trusted Local Services",
    description: "Book local services with clear rules, a separate VeroTask booking fee and verified work."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
