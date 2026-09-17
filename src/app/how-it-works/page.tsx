import type { Metadata } from "next";
import { HowItWorksPage } from "@/components/how-it-works-page";

export const metadata: Metadata = {
  title: "How VeroTask Works | VeroTask",
  description: "See how VeroTask matches customers and professionals, handles acceptance before the booking fee, verifies work, manages protection and supports bilateral ratings while service payment stays directly between customer and professional."
};

export default function Page() {
  return <HowItWorksPage locale="en" />;
}
