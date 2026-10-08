"use client";

import { useEffect, useState } from "react";

type Invoice = { id: string; number: string | null; status: string | null; amount: number; created: string; url: string | null; pdf: string | null };

/** Update card (Stripe portal), invoices, re-sync. Shared by the expert Billing and partner Account pages. */
export default function BillingActions({ audience, theme, hasCard, onSynced }: { audience: "expert" | "partner"; theme: "expert" | "partner"; hasCard: boolean; onSynced: () => void }) {
  const [stripeOn, setStripeOn] = useState<boolean | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const btn = theme === "partner" ? "pw-btn ghost" : "xp-btn ghost";
  const msgCls = theme === "partner" ? "pw-msg info" : "xp-msg info";

  useEffect(() => {
    fetch("/api/stripe/availability").then((r) => r.json()).then((d) => setStripeOn(!!d.stripe)).catch(() => setStripeOn(false));
  }, []);

  async function portal() {
    setBusy("portal"); setMsg(null);
    const r = await fetch(`/api/${audience}/billing/portal`, { method: "POST" });
    const d = await r.json();
    setBusy(null);
    if (d.ok && d.url) window.location.href = d.url; else setMsg(d.error || "Could not open the billing portal.");
  }
  async function loadInvoices() {
    setBusy("invoices");
    const r = await fetch(`/api/${audience}/billing/invoices`);
    const d = await r.json();
    setBusy(null);
    setInvoices(d.ok ? d.rows : []);
  }
  async function sync() {
    setBusy("sync"); setMsg(null);
    const r = await fetch(`/api/${audience}/billing/sync`, { method: "POST" });
    const d = await r.json();
    setBusy(null);
    setMsg(d.ok ? (d.synced ? `Synced: ${d.status}.` : "Nothing to sync yet.") : d.error || "Sync failed.");
    onSynced();
  }

  if (stripeOn === false) return <div className={msgCls}>Card setup and invoices arrive when billing goes live. You will get one reminder email 7 days before your first charge, never a surprise.</div>;
  return (
    <div>
      {msg && <div className={msgCls}>{msg}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={btn} disabled={!hasCard || busy !== null} onClick={portal} title={hasCard ? "" : "Save a card first"}>{busy === "portal" ? "Opening…" : "Update payment method or cancel"}</button>
        <button className={btn} disabled={busy !== null} onClick={loadInvoices}>{busy === "invoices" ? "Loading…" : "Invoices"}</button>
        <button className={btn} disabled={busy !== null} onClick={sync}>{busy === "sync" ? "Syncing…" : "Re-sync with Stripe"}</button>
      </div>
      {invoices && (
        <table className={theme === "partner" ? "pw-table" : "xp-feetable"} style={{ marginTop: 14 }}>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={3} style={{ color: "#74806a" }}>No invoices yet. Your first one arrives after your free founding months.</td></tr>}
            {invoices.map((i) => (
              <tr key={i.id}><td>{new Date(i.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{i.number ? ` · ${i.number}` : ""}</td><td>{i.status}</td><td>${i.amount.toFixed(2)}{i.url && <> · <a href={i.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>View</a></>}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
