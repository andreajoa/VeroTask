"use client";

import { useMemo, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { useRouter } from "next/navigation";

export function StripeConnectOnboarding({ businessId, publishableKey }: { businessId: string; publishableKey: string }) {
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
        <h2 className="text-xl font-black text-slate-950">Checking your Stripe status</h2>
        <p className="mt-2 text-sm text-slate-600">VeroTask will enable marketplace bookings only after Stripe confirms the required account capabilities.</p>
        <button className="btn-primary mt-5" onClick={() => { setExited(false); router.refresh(); }}>Refresh status</button>
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
