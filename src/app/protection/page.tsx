import type { Metadata } from "next";
import { ProtectionPage } from "@/components/protection-page";

export const metadata: Metadata = {
  title: "Payment Protection, Cancellations & Disputes",
  description: "Understand VeroTask payment protection, the 24-hour customer review window, proof of service, refunds, cancellations and dispute handling."
};

export default function Page() {
  return <ProtectionPage locale="en" />;
}
