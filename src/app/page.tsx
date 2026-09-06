import { HomePage } from "@/components/home-page";
import { ReturningCustomerPrompt } from "@/components/returning-customer-prompt";

export const dynamic = "force-dynamic";

export default function Page() {
  return <><HomePage locale="en" /><ReturningCustomerPrompt locale="en" /></>;
}
