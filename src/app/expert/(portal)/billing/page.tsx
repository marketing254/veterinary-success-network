"use client";

import Link from "next/link";
import { useExpert } from "@/components/expert/ExpertContext";
import { providerRampRows, PAYMENT_GRACE_DAYS, CANCEL_NOTICE_DAYS } from "@/lib/providerBilling";
import BillingActions from "@/components/billing/BillingActions";

export default function ExpertBillingPage() {
  const { me, refresh } = useExpert();
  if (!me) return null;
  const b = me.billing;
  const e = me.expert;
  const rows = providerRampRows("ladder", { expert: true, founding: b.founding, freeUntil: b.freeUntil ? new Date(b.freeUntil) : null });

  return (
    <div className="xp-grid c2">
      <section className="xp-card">
        <h2>Your terms</h2>
        <p className="lead">{b.terms}{b.provisional ? " The member launch date is not set yet, so this date is provisional and will be confirmed before any charge." : ""}</p>
        <table className="xp-feetable">
          <tbody>{rows.map((r) => <tr key={r.period}><td>{r.period}</td><td>{r.amount}</td></tr>)}</tbody>
        </table>
        <dl className="xp-kv" style={{ marginTop: 16 }}>
          <dt>Status</dt><dd>{b.label}</dd>
          <dt>Free until</dt><dd>{b.state === "exempt" ? "Always" : b.freeUntilLabel}</dd>
          <dt>Card on file</dt><dd>{e.card_brand ? `${e.card_brand} ending ${e.card_last4}` : "Not yet"}</dd>
          <dt>Agreement</dt><dd>{e.agreement_signed_at ? `Accepted (${e.agreement_version})` : "Not yet"}</dd>
        </dl>
      </section>
      <div className="xp-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="xp-card">
          <h2>{b.label}</h2>
          <p className="lead">{b.detail}</p>
          {b.state === "unsigned" && <Link className="xp-btn primary" href="/expert/agreement">Accept your agreement</Link>}
          {b.state === "awaiting_card" && <Link className="xp-btn primary" href="/expert/agreement" style={{ marginBottom: 12 }}>Save your card</Link>}
          {b.state !== "unsigned" && b.state !== "exempt" && <BillingActions audience="expert" theme="expert" hasCard={!!e.card_last4 || !!e.subscription_status} onSynced={refresh} />}
        </section>
        <section className="xp-card">
          <h2>Cancelling</h2>
          <ul className="xp-check">
            <li><span className="tk" style={{ background: "var(--xp-green)", borderColor: "var(--xp-green)" }}>✓</span>Before your first charge: cancel any time, nothing is billed.</li>
            <li><span className="tk" style={{ background: "var(--xp-green)", borderColor: "var(--xp-green)" }}>✓</span>After your first charge: {CANCEL_NOTICE_DAYS} days&apos; written notice by email.</li>
            <li><span className="tk" style={{ background: "var(--xp-green)", borderColor: "var(--xp-green)" }}>✓</span>Failed charge: your listing stays live for {PAYMENT_GRACE_DAYS} days while you update your card.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
