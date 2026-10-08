"use client";

import { FormEvent, useEffect, useState } from "react";
import { useExpert, api, fmtDate } from "@/components/expert/ExpertContext";
import { expertAgreementSections, EXPERT_AGREEMENT_VERSION, EXPERT_AGREEMENT_UPDATED } from "@/content/legal/expertAgreement";
import { providerRampRows } from "@/lib/providerBilling";
import CardCapture from "@/components/billing/CardCapture";

type Status = { signed: boolean; signedAt: string | null; signedName: string | null; signedVersion: string | null; founding: boolean; exempt: boolean; cardRequired: boolean; hasSubscription: boolean; downloadUrl: string | null };

export default function ExpertAgreementPage() {
  const { me, refresh } = useExpert();
  const [st, setSt] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const r = await api<Status>("/api/expert/agreement");
    if (r.ok) setSt(r.data);
  }
  useEffect(() => { load(); }, []);
  if (!me) return null;
  const founding = me.billing.founding;
  const freeUntil = me.billing.freeUntil ? new Date(me.billing.freeUntil) : null;
  const sections = expertAgreementSections({ founding, freeUntil });
  const rows = me.expert.billing_exempt ? [{ period: "Always", amount: "$0 (founding expert, free for life)" }] : providerRampRows("ladder", { expert: true, founding, freeUntil });

  async function signNoCard(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api("/api/expert/agreement", { method: "POST", body: JSON.stringify({ name, agree }) });
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: "Agreement accepted. A signed copy is on its way to your inbox." }); await load(); refresh(); }
    else setMsg({ kind: "err", text: r.data.error || "Could not record your acceptance." });
  }
  async function done() {
    setMsg({ kind: "ok", text: "Card saved and agreement accepted. Nothing was charged. A signed copy is on its way to your inbox." });
    await load(); refresh();
  }

  return (
    <div className="xp-grid c2">
      <section className="xp-card">
        <h2>Expert Agreement</h2>
        <p className="lead">Version {EXPERT_AGREEMENT_VERSION} · Last updated {EXPERT_AGREEMENT_UPDATED}. Read it here, or <a href="/api/expert/agreement?draft=1" target="_blank" rel="noreferrer" style={{ color: "var(--xp-deep)", fontWeight: 700 }}>open your personalised PDF</a>.</p>
        <div className="xp-agree">
          <p><i>Between the Veterinary Success Network (&quot;VSN&quot;, &quot;we&quot;, &quot;us&quot;), a service offered by Ekwa Marketing Inc., and {me.expert.full_name} (&quot;you&quot;).</i></p>
          {sections.map((s) => (
            <div key={s.heading}><h3>{s.heading}</h3>{s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}{s.bullets && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}</div>
          ))}
        </div>
      </section>

      <div className="xp-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="xp-card">
          <h2>Your fees</h2>
          <p className="lead">{me.expert.billing_exempt ? "Founding expert: free for life. No card needed." : founding ? "Founding expert: 12 free months from member launch, then $39 a month." : "6 free months from member launch, then $39 a month, no increase."}{me.billing.provisional && !me.expert.billing_exempt ? " The launch date is not set yet, so dates are provisional." : ""}</p>
          <table className="xp-feetable"><tbody>{rows.map((r) => <tr key={r.period}><td>{r.period}</td><td>{r.amount}</td></tr>)}</tbody></table>
          <p className="lead" style={{ margin: "10px 0 0" }}>Due today: <b style={{ color: "var(--xp-side)" }}>$0.00</b>.</p>
        </section>

        {!st ? (
          <section className="xp-card xp-empty">Loading…</section>
        ) : st.signed ? (
          <section className="xp-card">
            <h2>Accepted</h2>
            {msg && <div className={`xp-msg ${msg.kind}`}>{msg.text}</div>}
            <dl className="xp-kv"><dt>Signed as</dt><dd>{st.signedName}</dd><dt>On</dt><dd>{fmtDate(st.signedAt)}</dd><dt>Version</dt><dd>{st.signedVersion}</dd></dl>
            {st.downloadUrl && <a className="xp-btn primary" href={st.downloadUrl} target="_blank" rel="noreferrer" style={{ marginTop: 16 }}>Download signed PDF</a>}
            {st.cardRequired && !st.hasSubscription && (
              <div style={{ marginTop: 18 }}>
                <h2>Save your card to activate your free founding months</h2>
                <p className="lead">You accepted before billing opened. Save a card now; nothing is charged today.</p>
                <CardCapture prepareUrl="/api/expert/billing/prepare" startUrl="/api/expert/billing/start" extraBody={() => ({ name: st.signedName || me.expert.full_name, agree: true })} canSubmit label="Save card · Due today $0.00" onDone={done} theme="expert" />
              </div>
            )}
          </section>
        ) : (
          <div className="xp-signbox">
            <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 18, color: "var(--xp-side)", margin: "0 0 10px" }}>Accept the agreement</h2>
            {msg && <div className={`xp-msg ${msg.kind}`}>{msg.text}</div>}
            <div className="xp-field">
              <label>Type your full name as your signature</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={me.expert.full_name} maxLength={160} required />
            </div>
            <label className="row">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I have read and agree to the VSN Expert Agreement (version {EXPERT_AGREEMENT_VERSION}). My acceptance is recorded electronically and a signed copy will be emailed to me.</span>
            </label>
            {st.cardRequired ? (
              <CardCapture prepareUrl="/api/expert/billing/prepare" startUrl="/api/expert/billing/start" extraBody={() => ({ name, agree })} canSubmit={agree && name.trim().length >= 2} label="Accept agreement and save card · Due today $0.00" onDone={done} theme="expert" />
            ) : (
              <form onSubmit={signNoCard}>
                <button className="xp-btn primary" type="submit" disabled={busy || !agree || name.trim().length < 2}>{busy ? "Recording…" : "Accept agreement · Due today $0.00"}</button>
                {!st.exempt && <p className="lead" style={{ margin: "10px 0 0" }}>Card details are collected when billing opens; nothing is charged during your free founding months.</p>}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
