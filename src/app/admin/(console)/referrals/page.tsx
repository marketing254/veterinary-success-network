"use client";

import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";
import { adminApi, useAdminList, useFlash, Head } from "@/components/admin/useAdmin";

type Code = { id: string; code: string; slug: string | null; link: string; owner: string; ownerKind: string; ownerEmail: string; active: boolean; signups: number; converted: number; due: number; paid: number };
type Signup = { id: string; code_id: string; email: string | null; member_id: string | null; reservation_id: string | null; converted_at: string | null; payout_cents: number; paid_out_at: string | null; created_at: string };

export default function ReferralsAdminPage() {
  const { rows, extra, loading, reload } = useAdminList<Code>("/api/admin/referrals");
  const signups = (extra.signups as Signup[] | undefined) ?? [];
  const { flash, Msg } = useFlash();
  const due = rows.reduce((s, r) => s + r.due, 0);

  async function act(id: string, action: string) {
    const r = await adminApi("/api/admin/referrals", { method: "PATCH", body: JSON.stringify({ id, action }) });
    if (r.ok) reload(); else flash("err", r.data.error || "Failed.");
  }
  const ownerOf = (codeId: string) => rows.find((c) => c.id === codeId);

  return (
    <>
      <Head title="Referrals" sub="Every expert and partner has a code and a vanity link. $50 is owed after the referred member's first payment. Until Stripe is live, mark conversions by hand; mark paid once you have sent the money.">
        <span className="adm-chip">${(due / 100).toLocaleString()} owed</span>
      </Head>
      {Msg}
      <div className="adm-card">
        <div className="hd"><h2>Codes</h2></div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Owner</th><th>Code · link</th><th>Signups</th><th>Paid members</th><th>Owed</th><th>Paid out</th></tr></thead>
            <tbody>
              {rows.length === 0 && !loading && <tr><td colSpan={6}><div className="adm-empty">No referral codes yet. They are created the first time a provider opens their portal.</div></td></tr>}
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="em">{c.owner}<span className="sub"><StatusBadge status={c.ownerKind} /> {c.ownerEmail}</span></td>
                  <td><span className="adm-copy"><code>{c.code}</code><code>{c.link}</code><button className="adm-btn sm" onClick={() => navigator.clipboard?.writeText(c.link)}>Copy</button></span></td>
                  <td>{c.signups}</td><td>{c.converted}</td><td>${(c.due / 100).toLocaleString()}</td><td>${(c.paid / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="adm-card">
        <div className="hd"><h2>Referred signups</h2></div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>When</th><th>Referred</th><th>Referrer</th><th>First payment</th><th>Payout</th><th></th></tr></thead>
            <tbody>
              {signups.length === 0 && !loading && <tr><td colSpan={6}><div className="adm-empty">No referred signups yet.</div></td></tr>}
              {signups.map((s) => {
                const o = ownerOf(s.code_id);
                return (
                  <tr key={s.id}>
                    <td>{fmtDate(s.created_at)}</td>
                    <td className="em">{s.email || (s.member_id ? "Member" : "Reservation")}<span className="sub">{s.member_id ? "member" : "waitlist reservation"}</span></td>
                    <td>{o?.owner ?? "—"}</td>
                    <td>{s.converted_at ? fmtDate(s.converted_at) : <StatusBadge status="pending" />}</td>
                    <td>{s.paid_out_at ? `Paid ${fmtDate(s.paid_out_at)}` : s.converted_at ? <StatusBadge status="open" /> : "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {!s.converted_at && <button className="adm-btn sm" onClick={() => act(s.id, "mark_converted")}>Mark first payment</button>}
                      {s.converted_at && !s.paid_out_at && <button className="adm-btn sm primary" onClick={() => act(s.id, "mark_paid")}>Mark paid ${s.payout_cents / 100}</button>}
                      {s.paid_out_at && <button className="adm-btn sm" onClick={() => act(s.id, "unmark_paid")}>Undo paid</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
