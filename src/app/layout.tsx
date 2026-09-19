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
    default: "VeroTask | Local Services in Orlando, FL",
    template: "%s | VeroTask Orlando"
  },
  description: "Find local professionals in Orlando, Florida and Central Florida. Request quotes, compare local Pros and book through VeroTask's protected local marketplace.",
  applicationName: "VeroTask",
  verification: {
    google: "g7DcEyI2I4ao2UQTEm5pvalz7vB3sIWIyJ8urKACCf0",
    other: Object.keys(verificationOther).length ? verificationOther : undefined
  },
  openGraph: {
    type: "website",
    siteName: "VeroTask",
    title: "VeroTask | Local Services in Orlando, FL",
    description: "Find and book local professionals serving Orlando and Central Florida, United States.",
    locale: "en_US",
    alternateLocale: ["es_US", "pt_US"]
  },
  twitter: {
    card: "summary_large_image",
    title: "VeroTask | Local Services in Orlando, FL",
    description: "Find and book local professionals serving Orlando and Central Florida, United States."
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
