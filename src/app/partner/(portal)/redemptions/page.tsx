"use client";

import { useEffect, useState } from "react";
import { usePartner, api, fmtDate } from "@/components/partner/PartnerContext";

type R = { id: string; member: string; location: string | null; amount_saved: number | null; status: string; redeemed_on: string; notes: string | null; offer: string; promo_code: string | null };

export default function PartnerRedemptionsPage() {
  const { me } = usePartner();
  const [rows, setRows] = useState<R[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ rows: R[]; totalSaved: number }>("/api/partner/redemptions").then((r) => { if (r.ok) { setRows(r.data.rows); setTotal(r.data.totalSaved); } setLoading(false); });
  }, []);
  if (!me) return null;
  return (
    <div className="pw-grid" style={{ gap: 18 }}>
      <div className="pw-grid c3">
        <div className="pw-card pw-stat"><span className="k">Redemptions</span><span className="v">{rows.filter((r) => r.status === "confirmed").length}</span><span className="d">confirmed</span></div>
        <div className="pw-card pw-stat"><span className="k">Member savings</span><span className="v">${Math.round(total).toLocaleString()}</span><span className="d">value delivered to members</span></div>
        <div className="pw-card pw-stat"><span className="k">Pending</span><span className="v">{rows.filter((r) => r.status === "pending").length}</span><span className="d">awaiting confirmation</span></div>
      </div>
      <section className="pw-card">
        <h2>Redemption log</h2>
        <p className="lead">Members are shown by first name and location only. The team logs redemptions you report; member self-service redemption arrives with the member portal.</p>
        {loading ? <div className="pw-empty">Loading…</div> : rows.length === 0 ? <div className="pw-empty"><b>No redemptions yet</b>Once members start using your offers they show up here with the offer, date and savings.</div> : (
          <table className="pw-table">
            <thead><tr><th>Date</th><th>Member</th><th>Offer</th><th>Status</th><th>Saved</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><td>{fmtDate(r.redeemed_on)}</td><td>{r.member}{r.location ? `, ${r.location}` : ""}</td><td>{r.offer}{r.promo_code ? ` (${r.promo_code})` : ""}</td><td><span className={`pw-tag ${r.status}`}>{r.status}</span></td><td>{r.amount_saved != null ? `$${Number(r.amount_saved).toLocaleString()}` : ""}</td></tr>)}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
