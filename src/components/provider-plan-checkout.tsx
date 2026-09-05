"use client";

import { useCallback } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

export function ProviderPlanCheckout({ businessId, plan, publishableKey }: { businessId: string; plan: "pro" | "elite"; publishableKey: string }) {
  const stripePromise = loadStripe(publishableKey);

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch("/api/stripe/subscriptions/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessId, plan })
    });
    const data = await response.json() as { client_secret?: string; error?: string };
    if (!response.ok || !data.client_secret) throw new Error(data.error ?? "Unable to start checkout");
    return data.client_secret;
  }, [businessId, plan]);

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
