import type { Metadata } from "next";
import { ProvidersOverviewPage } from "@/components/providers-overview-page";

export const metadata: Metadata = {
  title: "For Providers | VeroTask",
  description: "Join VeroTask free, control your schedule, review customer requests before payment, and receive the full service price directly from your customer."
};

export default function Page() {
  return <ProvidersOverviewPage locale="en" />;
}
