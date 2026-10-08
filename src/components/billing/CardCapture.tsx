"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

/**
 * Sign-and-pay card step. Mounts Stripe's PaymentElement against a SetupIntent
 * from `prepareUrl`, then on submit confirms the setup (no charge) and POSTs
 * `startUrl` with { setupIntentId, paymentMethodId, ...extraBody }.
 * When Stripe is not configured the parent should not render this component.
 */
export const STD_ERR = "Something went wrong on our side. Nothing was charged. Please try again, or email support@veterinarysuccessnetwork.com.";

type Props = {
  prepareUrl: string;
  startUrl: string;
  extraBody: () => Record<string, unknown>;
  canSubmit: boolean;
  label: string;
  onDone: (result: Record<string, unknown>) => void;
  theme?: "expert" | "partner" | "founding";
};

let stripePromise: Promise<Stripe | null> | null = null;

function Inner({ startUrl, extraBody, canSubmit, label, onDone, theme }: Omit<Props, "prepareUrl">) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const btn = theme === "partner" ? "pw-btn primary" : theme === "founding" ? "fa-btn" : "xp-btn primary";

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setErr(null);
    try {
      const { error: subErr } = await elements.submit();
      if (subErr) { setErr(subErr.message || STD_ERR); setBusy(false); return; }
      const result = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: window.location.href } });
      let setupIntent = result.setupIntent ?? null;
      if (result.error) {
        // Stripe reports an already-confirmed intent as an error carrying the intent; proceed with it.
        const si = (result.error as { setup_intent?: { status?: string; id?: string; payment_method?: unknown } }).setup_intent;
        if (si && si.status === "succeeded") setupIntent = si as typeof setupIntent;
        else { setErr(result.error.message || STD_ERR); setBusy(false); return; }
      }
      if (!setupIntent || setupIntent.status !== "succeeded") { setErr("Card setup did not complete. Please try again."); setBusy(false); return; }
      const pm = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
      const res = await fetch(startUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupIntentId: setupIntent.id, paymentMethodId: pm, ...extraBody() }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) onDone(data);
      else setErr(data.error || STD_ERR);
    } catch {
      setErr(STD_ERR);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      <div style={{ margin: "6px 0 14px" }}>
        <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
      </div>
      {err && <div className={theme === "partner" ? "pw-msg err" : theme === "founding" ? "fa-err" : "xp-msg err"}>{err}</div>}
      <button className={btn} type="submit" disabled={busy || !ready || !canSubmit || !stripe}>{busy ? "Saving your card…" : label}</button>
      <p style={{ fontSize: 12.5, color: "#74806a", margin: "10px 0 0", lineHeight: 1.5 }}>Due today <b>$0.00</b>. Your card is saved securely with Stripe and nothing is charged until your free founding months end. We remind you 7 days before.</p>
    </form>
  );
}

export default function CardCapture(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const prepared = useRef<string | null>(null);

  useEffect(() => {
    // React strict mode runs effects twice in development; prepare exactly once per URL so only one SetupIntent exists.
    if (prepared.current === props.prepareUrl) return;
    prepared.current = props.prepareUrl;
    fetch(props.prepareUrl, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.clientSecret) { setClientSecret(d.clientSecret); setPk(d.publishableKey); }
        else setErr(d.error || STD_ERR);
      })
      .catch(() => setErr(STD_ERR));
  }, [props.prepareUrl]);

  const promise = useMemo(() => {
    if (!pk) return null;
    if (!stripePromise) stripePromise = loadStripe(pk);
    return stripePromise;
  }, [pk]);

  if (err) return <div className={props.theme === "partner" ? "pw-msg err" : props.theme === "founding" ? "fa-err" : "xp-msg err"}>{err}</div>;
  if (!clientSecret || !promise) return <div style={{ fontSize: 13.5, color: "#74806a", padding: "10px 0" }}>Preparing secure card form…</div>;
  return (
    <Elements stripe={promise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#3BAB00", borderRadius: "10px", fontFamily: "system-ui, sans-serif" } } }}>
      <Inner {...props} />
    </Elements>
  );
}
