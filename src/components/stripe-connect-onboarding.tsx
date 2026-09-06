"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { useRouter } from "next/navigation";

export function StripeConnectOnboarding({ businessId, publishableKey, nextHref, nextLabel }: { businessId: string; publishableKey: string; nextHref?: string; nextLabel?: string }) {
  const router = useRouter();
  const [exited, setExited] = useState(false);

  const connectInstance = useMemo(() => loadConnectAndInitialize({
    publishableKey,
    fetchClientSecret: async () => {
      const response = await fetch("/api/stripe/connect/account-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId })
      });
      if (!response.ok) throw new Error("Unable to start Stripe onboarding");
      const data = await response.json() as { client_secret: string };
      return data.client_secret;
    },
    appearance: {
      variables: {
        colorPrimary: "#123b56",
        colorText: "#17212b",
        colorBackground: "#ffffff",
        borderRadius: "12px"
      }
    }
  }), [businessId, publishableKey]);

  if (exited) {
    return (
      <div className="rounded-[18px] border border-slate-200 bg-white p-7 text-center">
        <h2 className="text-xl font-black text-slate-950">Stripe onboarding submitted</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">VeroTask enables marketplace bookings only after Stripe confirms the required account capabilities. You can refresh the status or continue setting up the rest of your provider account.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button className="btn-secondary" onClick={() => { setExited(false); router.refresh(); }}>Refresh Stripe status</button>
          {nextHref && <Link className="btn-primary" href={nextHref}>{nextLabel || "Continue setup"}</Link>}
        </div>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <ConnectAccountOnboarding
        onExit={() => {
          setExited(true);
          router.refresh();
        }}
      />
    </ConnectComponentsProvider>
  );
}
