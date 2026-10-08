"use client";

import { useState } from "react";

/**
 * Shown on /join?wl=<reservation id> after launch: one click to Stripe Checkout.
 * Rendered above the normal reservation form, which stays exactly as it was.
 */
export default function ClaimSpot({ reservationId }: { reservationId: string }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/member/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId, billing }) });
      const d = await r.json();
      if (d.ok && d.url) window.location.href = d.url;
      else setErr(d.error || "Could not start checkout. Please try again.");
    } catch {
      setErr("Could not start checkout. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="formcard" style={{ marginBottom: 22, border: "1.5px solid var(--green)" }}>
      <span className="atag" style={{ display: "inline-block", background: "linear-gradient(135deg,var(--green),var(--deep))", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", padding: "6px 15px", borderRadius: 30, marginBottom: 12 }}>Founding spot reserved</span>
      <h3 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 24, color: "var(--dark)", fontWeight: 600, margin: "0 0 8px" }}>Claim your founding spot.</h3>
      <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>Your details are saved. Choose monthly or annual and pay securely with Stripe. 30-day money-back guarantee, cancel anytime.</p>
      {err && <div className="ferror show" style={{ marginTop: 0, marginBottom: 14 }}>{err}</div>}
      <div className="optrow" style={{ marginBottom: 16 }}>
        <label className="opt"><input type="radio" name="claim-billing" checked={billing === "monthly"} onChange={() => setBilling("monthly")} /><span>Monthly <small>$29/mo</small></span></label>
        <label className="opt"><input type="radio" name="claim-billing" checked={billing === "annual"} onChange={() => setBilling("annual")} /><span>Annual <small>$290/yr · 2 months free</small></span></label>
      </div>
      <button className="btn solid" type="button" disabled={busy} onClick={go}>{busy ? "Opening secure checkout…" : "Pay and activate my membership"}</button>
      <p className="fnote">Founding rate shown; if the first 100 spots are gone by the time you pay, checkout shows the standard $99/mo or $990/yr.</p>
    </div>
  );
}
