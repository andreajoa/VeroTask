import type { Metadata } from "next";
import { HowItWorksPage } from "@/components/how-it-works-page";

export const metadata: Metadata = {
  title: "How VeroTask Works | VeroTask",
  description: "See how VeroTask matches customers and professionals, handles acceptance before payment, verifies work, manages protection, payouts and bilateral ratings."
};

export default function Page() {
  return <HowItWorksPage locale="en" />;
}
