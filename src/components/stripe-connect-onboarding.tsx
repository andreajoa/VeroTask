import Link from "next/link";

/**
 * Compatibility component retained for older imports.
 *
 * VeroTask does not use Stripe Connect. Customers pay the professional's
 * service price directly to the professional. Stripe is used by VeroTask only
 * for the separate VeroTask booking fee and optional provider subscriptions.
 */
export function StripeConnectOnboarding({
  nextHref,
  nextLabel
}: {
  businessId: string;
  publishableKey: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-7 text-center">
      <h2 className="text-xl font-black text-slate-950">No payout account is required</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        VeroTask does not collect or transfer the professional&apos;s service price. Customers pay the professional directly according to the payment method agreed for the service. Stripe is used only for VeroTask fees and eligible VeroTask subscriptions.
      </p>
      {nextHref ? (
        <div className="mt-5 flex justify-center">
          <Link className="btn-primary" href={nextHref}>{nextLabel || "Continue setup"}</Link>
        </div>
      ) : null}
    </div>
  );
}
