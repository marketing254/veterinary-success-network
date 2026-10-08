"use client";

import { useEffect, useState } from "react";
import { adminApi, Head } from "@/components/admin/useAdmin";

type Price = { key: string; env: string; id: string | null; ok: boolean; amount?: number; interval?: string; note: string };
type Status = { configured: boolean; secretMode: string; publishableMode: string; webhookSecret: boolean; cronSecret: boolean; launchEnabled: boolean; launchDate: string | null; origin: string; prices: Price[]; webhook: { url?: string; found?: boolean; status?: string; missing?: string[]; paidEvent?: boolean; error?: string } | null };

const Chip = ({ ok, text }: { ok: boolean; text: string }) => <span className={`badge ${ok ? "approved" : "needs_changes"}`}>{text}</span>;

export default function StripeStatusPage() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => { adminApi<Status>("/api/admin/stripe/status").then((r) => r.ok && setS(r.data)); }, []);
  return (
    <>
      <Head title="Stripe status" sub="Read-only check of keys, the 11 prices, the webhook for this origin and the launch flags. Run scripts/stripe-setup-test.mjs to create prices and print the env lines." />
      {!s ? <div className="adm-card"><div className="adm-empty">Checking…</div></div> : (
        <>
          <div className="adm-stats">
            <div className="adm-stat"><div className="v"><Chip ok={s.configured} text={s.configured ? "ready" : "not configured"} /></div><div className="t">Stripe</div><div className="s">secret {s.secretMode} · publishable {s.publishableMode}</div></div>
            <div className="adm-stat"><div className="v"><Chip ok={s.webhookSecret} text={s.webhookSecret ? "set" : "missing"} /></div><div className="t">Webhook secret</div><div className="s">STRIPE_WEBHOOK_SECRET</div></div>
            <div className="adm-stat"><div className="v"><Chip ok={s.cronSecret} text={s.cronSecret ? "set" : "missing"} /></div><div className="t">Cron secret</div><div className="s">daily 7-day reminders</div></div>
            <div className="adm-stat"><div className="v"><Chip ok={!!s.launchDate} text={s.launchDate || "not set"} /></div><div className="t">Member launch date</div><div className="s">launch {s.launchEnabled ? "ON" : "OFF"} · free periods provisional until set</div></div>
          </div>
          <div className="adm-card">
            <div className="hd"><h2>Prices</h2></div>
            <div className="adm-tablewrap"><table className="adm-table"><thead><tr><th>Key</th><th>Env</th><th>Price id</th><th>Amount</th><th>Status</th></tr></thead><tbody>
              {s.prices.map((p) => <tr key={p.key}><td className="em">{p.key}</td><td><code>{p.env}</code></td><td><code>{p.id || "—"}</code></td><td>{p.amount != null ? `$${p.amount}/${p.interval}` : "—"}</td><td><Chip ok={p.ok} text={p.ok ? "ok" : p.note} /></td></tr>)}
            </tbody></table></div>
          </div>
          <div className="adm-card">
            <div className="hd"><h2>Webhook for {s.origin}</h2></div>
            <dl className="adm-kv">
              <dt>Endpoint</dt><dd>{s.webhook?.url}</dd>
              <dt>Found</dt><dd><Chip ok={!!s.webhook?.found} text={s.webhook?.found ? `yes (${s.webhook.status})` : s.webhook?.error || "no"} /></dd>
              <dt>Missing events</dt><dd>{s.webhook?.missing?.length ? s.webhook.missing.join(", ") : "none"}</dd>
              <dt>Paid event</dt><dd><Chip ok={!!s.webhook?.paidEvent} text={s.webhook?.paidEvent ? "invoice.paid or payment_succeeded" : "add invoice.paid"} /></dd>
            </dl>
          </div>
        </>
      )}
    </>
  );
}
