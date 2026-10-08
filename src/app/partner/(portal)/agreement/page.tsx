"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePartner, api, fmtDate } from "@/components/partner/PartnerContext";
import { partnerAgreementSections, PARTNER_AGREEMENT_VERSION, PARTNER_AGREEMENT_UPDATED } from "@/content/legal/partnerAgreement";
import { providerRampRows } from "@/lib/providerBilling";
import CardCapture from "@/components/billing/CardCapture";

type Status = { covered: boolean; signed: boolean; signedAt: string | null; signedName: string | null; signedVersion: string | null; cardRequired: boolean; hasSubscription: boolean; downloadUrl: string | null };

export default function PartnerAgreementPage() {
  const { me, refresh } = usePartner();
  const [st, setSt] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [agree, setAgree] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const r = await api<Status>("/api/partner/agreement");
    if (r.ok) setSt(r.data);
  }
  useEffect(() => { load(); }, []);
  if (!me) return null;
  const p = me.partner;
  const rate = me.billing.rate;
  const freeUntil = me.billing.freeUntil ? new Date(me.billing.freeUntil) : null;
  const sections = partnerAgreementSections({ rate, freeUntil });
  const rows = providerRampRows(rate, { freeUntil });
  const ready = agree && authorized && name.trim().length >= 2;

  async function signNoCard(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api("/api/partner/agreement", { method: "POST", body: JSON.stringify({ name, title, agree, authorized }) });
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: "Agreement accepted. A signed copy is on its way to your inbox." }); await load(); refresh(); }
    else setMsg({ kind: "err", text: r.data.error || "Could not record your acceptance." });
  }
  async function done() {
    setMsg({ kind: "ok", text: "Card saved and agreement accepted. Nothing was charged. A signed copy is on its way to your inbox." });
    await load(); refresh();
  }

  return (
    <div className="pw-grid c2">
      <section className="pw-card">
        <h2>Partner Agreement</h2>
        <p className="lead">Version {PARTNER_AGREEMENT_VERSION} · Last updated {PARTNER_AGREEMENT_UPDATED}. Read it here, or <a href="/api/partner/agreement?draft=1" target="_blank" rel="noreferrer" style={{ color: "var(--pw-green)", fontWeight: 700 }}>open the personalised PDF</a>.</p>
        <div className="pw-agree">
          <p><i>Between the Veterinary Success Network (&quot;VSN&quot;, &quot;we&quot;, &quot;us&quot;), a service offered by Ekwa Marketing Inc., and {p.company_name} (&quot;you&quot;).</i></p>
          {sections.map((s) => (
            <div key={s.heading}><h3>{s.heading}</h3>{s.paragraphs?.map((t, i) => <p key={i}>{t}</p>)}{s.bullets && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}</div>
          ))}
        </div>
      </section>
      <div className="pw-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="pw-card">
          <h2>Your fees</h2>
          <p className="lead">{rate === "flat" ? "Flat plan: $39 a month after the free months, no increase." : "Ladder plan: $39 a month for 12 months after the free months, then $149."}{me.billing.provisional ? " The launch date is not set yet, so dates are provisional." : ""}</p>
          <table className="pw-fee"><tbody>{rows.map((r) => <tr key={r.period}><td>{r.period}</td><td>{r.amount}</td></tr>)}</tbody></table>
          <p className="lead" style={{ margin: "10px 0 0" }}>Due today: <b style={{ color: "var(--pw-deep)" }}>$0.00</b>.</p>
        </section>
        {!st ? (
          <section className="pw-card pw-empty">Loading…</section>
        ) : st.covered ? (
          <section className="pw-card"><h2>Covered listing</h2><p className="lead" style={{ margin: 0 }}>{me.billing.state === "house" ? "This is a Veterinary Success Network company. No agreement or fees apply." : `This company is covered by ${me.parent?.company_name}'s agreement and subscription. Nothing to sign here.`}</p></section>
        ) : st.signed ? (
          <section className="pw-card">
            <h2>Accepted</h2>
            {msg && <div className={`pw-msg ${msg.kind}`}>{msg.text}</div>}
            <dl className="pw-kv"><dt>Signed as</dt><dd>{st.signedName}</dd><dt>On</dt><dd>{fmtDate(st.signedAt)}</dd><dt>Version</dt><dd>{st.signedVersion}</dd></dl>
            {st.downloadUrl && <a className="pw-btn primary" href={st.downloadUrl} target="_blank" rel="noreferrer" style={{ marginTop: 16 }}>Download signed PDF</a>}
            {st.cardRequired && !st.hasSubscription && (
              <div style={{ marginTop: 18 }}>
                <h2>Save your card to activate your free founding months</h2>
                <p className="lead">You accepted before billing opened. Save a card now; nothing is charged today.</p>
                <CardCapture prepareUrl="/api/partner/billing/prepare" startUrl="/api/partner/billing/start" extraBody={() => ({ name: st.signedName || p.contact_name, title: p.signer_title || "", agree: true, authorized: true })} canSubmit label="Save card · Due today $0.00" onDone={done} theme="partner" />
              </div>
            )}
          </section>
        ) : p.status !== "approved" ? (
          <section className="pw-card"><h2>In review</h2><p className="lead" style={{ margin: 0 }}>You can accept the agreement once the team approves your application.</p></section>
        ) : (
          <div className="pw-signbox">
            <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 18, color: "var(--pw-deep)", margin: "0 0 10px" }}>Accept on behalf of {p.company_name}</h2>
            {msg && <div className={`pw-msg ${msg.kind}`}>{msg.text}</div>}
            <div className="pw-2col">
              <div className="pw-field"><label>Your full name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={p.contact_name} maxLength={160} required /></div>
              <div className="pw-field"><label>Your title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Owner, VP Sales…" maxLength={120} /></div>
            </div>
            <label className="row"><input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} /><span>I am authorised to commit {p.company_name} to this agreement.</span></label>
            <label className="row"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I have read and agree to the VSN Partner Agreement (version {PARTNER_AGREEMENT_VERSION}). Acceptance is recorded electronically and a signed copy will be emailed to {p.contact_email}.</span></label>
            {st.cardRequired ? (
              <CardCapture prepareUrl="/api/partner/billing/prepare" startUrl="/api/partner/billing/start" extraBody={() => ({ name, title, agree, authorized })} canSubmit={ready} label="Accept agreement and save card · Due today $0.00" onDone={done} theme="partner" />
            ) : (
              <form onSubmit={signNoCard}>
                <button className="pw-btn primary" type="submit" disabled={busy || !ready}>{busy ? "Recording…" : "Accept agreement · Due today $0.00"}</button>
                <p className="lead" style={{ margin: "10px 0 0" }}>Card details are collected when billing opens; nothing is charged during your free founding months.</p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
