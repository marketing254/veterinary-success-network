"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePartner, api } from "@/components/partner/PartnerContext";
import { providerRampRows, PAYMENT_GRACE_DAYS, CANCEL_NOTICE_DAYS } from "@/lib/providerBilling";
import BillingActions from "@/components/billing/BillingActions";

export default function PartnerAccountPage() {
  const { me, refresh } = usePartner();
  const router = useRouter();
  const [billingEmail, setBillingEmail] = useState("");
  const [signer, setSigner] = useState({ signer_name: "", signer_title: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  useEffect(() => {
    if (!me) return;
    setBillingEmail(me.partner.billing_email || "");
    setSigner({ signer_name: me.partner.signer_name || "", signer_title: me.partner.signer_title || "" });
  }, [me]);
  if (!me) return null;
  const p = me.partner;
  const b = me.billing;
  const rows = providerRampRows(b.rate, { freeUntil: b.freeUntil ? new Date(b.freeUntil) : null });

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api("/api/partner/profile", { method: "PATCH", body: JSON.stringify({ billing_email: billingEmail, ...signer }) });
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: "Saved." }); refresh(); } else setMsg({ kind: "err", text: r.data.error || "Could not save." });
  }
  async function signOut() {
    await fetch("/api/partner/logout", { method: "POST" });
    router.replace("/partner/login"); router.refresh();
  }

  return (
    <div className="pw-grid c2">
      <div className="pw-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="pw-card">
          <h2>{b.label}</h2>
          <p className="lead">{b.detail}{b.provisional ? " The member launch date is not set yet, so the free period is provisional and will be confirmed before any charge." : ""}</p>
          {b.state === "unsigned" && <Link className="pw-btn primary" href="/partner/agreement">Accept your agreement</Link>}
          {b.state === "awaiting_card" && <Link className="pw-btn primary" href="/partner/agreement" style={{ marginBottom: 12 }}>Save your card</Link>}
          {!["unsigned", "covered", "not_approved", "house"].includes(b.state) && <BillingActions audience="partner" theme="partner" hasCard={!!p.card_last4 || !!p.subscription_status} onSynced={refresh} />}
          {b.state !== "covered" && b.state !== "house" && (
            <>
              <table className="pw-fee" style={{ marginTop: 16 }}><tbody>{rows.map((r) => <tr key={r.period}><td>{r.period}</td><td>{r.amount}</td></tr>)}</tbody></table>
              <dl className="pw-kv" style={{ marginTop: 14 }}>
                <dt>Plan</dt><dd>{b.rate === "flat" ? "Flat ($39, no increase)" : "Ladder ($39 x 12, then $149)"}</dd>
                <dt>Free until</dt><dd>{b.freeUntilLabel}</dd>
                <dt>Card on file</dt><dd>{p.card_brand ? `${p.card_brand} ending ${p.card_last4}` : "Not yet"}</dd>
                <dt>Agreement</dt><dd>{p.agreement_signed_at ? `Accepted (${p.agreement_version})` : "Not yet"}</dd>
              </dl>
            </>
          )}
        </section>
        <section className="pw-card">
          <h2>Cancelling</h2>
          <ul className="pw-check">
            <li className="done"><span className="tk">✓</span>Before your first charge: cancel any time, nothing is billed.</li>
            <li className="done"><span className="tk">✓</span>After your first charge: {CANCEL_NOTICE_DAYS} days&apos; written notice by email.</li>
            <li className="done"><span className="tk">✓</span>Failed charge: your listing stays live for {PAYMENT_GRACE_DAYS} days while you update your card.</li>
          </ul>
        </section>
      </div>
      <div className="pw-grid" style={{ gap: 18, alignContent: "start" }}>
        <form className="pw-card" onSubmit={save}>
          <h2>Billing contact</h2>
          <p className="lead">Invoices and the pre-charge reminder go here. Blank means the contact email.</p>
          {msg && <div className={`pw-msg ${msg.kind}`}>{msg.text}</div>}
          <div className="pw-field"><label>Billing email</label><input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder={p.contact_email} /></div>
          <div className="pw-2col">
            <div className="pw-field"><label>Authorised signer</label><input value={signer.signer_name} onChange={(e) => setSigner((s) => ({ ...s, signer_name: e.target.value }))} maxLength={160} /></div>
            <div className="pw-field"><label>Title</label><input value={signer.signer_title} onChange={(e) => setSigner((s) => ({ ...s, signer_title: e.target.value }))} maxLength={120} /></div>
          </div>
          <button className="pw-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </form>
        {me.covered.length > 0 && (
          <section className="pw-card">
            <h2>Covered companies</h2>
            <p className="lead">These listings are covered by this account&apos;s subscription and agreement. Ask the team to add or remove one.</p>
            <ul className="pw-check">{me.covered.map((c) => <li key={c.id} className="done"><span className="tk">✓</span>{c.company_name}{c.category ? ` · ${c.category}` : ""}</li>)}</ul>
          </section>
        )}
        {me.parent && (
          <section className="pw-card"><h2>Principal company</h2><p className="lead" style={{ margin: 0 }}>This listing is covered by <b>{me.parent.company_name}</b>. Billing and the agreement live on that account.</p></section>
        )}
        <section className="pw-card">
          <h2>Sign-in and account</h2>
          <dl className="pw-kv"><dt>Email</dt><dd>{p.contact_email}</dd><dt>Method</dt><dd>6-digit code by email</dd></dl>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button className="pw-btn ghost" onClick={signOut}>Sign out</button>
            <a className="pw-btn danger" href={`mailto:support@veterinarysuccessnetwork.com?subject=${encodeURIComponent(`Close ${p.company_name}'s VSN partner account`)}`}>Request account closure</a>
          </div>
        </section>
      </div>
    </div>
  );
}
