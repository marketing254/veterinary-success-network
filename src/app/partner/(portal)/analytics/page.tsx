"use client";

import { useEffect, useState } from "react";
import { usePartner, api } from "@/components/partner/PartnerContext";

type A = { totals30: Record<string, number>; totals90: Record<string, number>; weeks: number[]; lifetime: { inquiries: number; redemptions: number } };

const ROWS: [string, string][] = [
  ["profile_view", "Listing views"],
  ["offer_view", "Offer views"],
  ["catalog_view", "Catalog views"],
  ["booking_click", "Booking clicks"],
  ["website_click", "Website clicks"],
  ["inquiry", "Inquiries"],
  ["redemption", "Redemptions"],
];

export default function PartnerAnalyticsPage() {
  const { me } = usePartner();
  const [a, setA] = useState<A | null>(null);
  useEffect(() => { api<A>("/api/partner/analytics").then((r) => r.ok && setA(r.data)); }, []);
  if (!me) return null;
  const max = Math.max(1, ...(a?.weeks ?? [0]));
  const views30 = a?.totals30.profile_view ?? 0;
  const clicks30 = (a?.totals30.booking_click ?? 0) + (a?.totals30.website_click ?? 0);
  const rate = views30 ? Math.round((clicks30 / views30) * 100) : 0;

  return (
    <div className="pw-grid" style={{ gap: 18 }}>
      <div className="pw-grid c4">
        <div className="pw-card pw-stat"><span className="k">Listing views</span><span className="v">{views30}</span><span className="d">last 30 days</span></div>
        <div className="pw-card pw-stat"><span className="k">Clicks to you</span><span className="v">{clicks30}</span><span className="d">booking + website · {rate}% of views</span></div>
        <div className="pw-card pw-stat"><span className="k">Inquiries</span><span className="v">{a?.totals30.inquiry ?? 0}</span><span className="d">{a?.lifetime.inquiries ?? 0} lifetime</span></div>
        <div className="pw-card pw-stat"><span className="k">Redemptions</span><span className="v">{a?.totals30.redemption ?? 0}</span><span className="d">{a?.lifetime.redemptions ?? 0} lifetime</span></div>
      </div>
      <div className="pw-grid c2">
        <section className="pw-card">
          <h2>Listing views, last 12 weeks</h2>
          <p className="lead">Views of your public listing page. Member-portal views are added when the network opens.</p>
          <div className="pw-bars">{(a?.weeks ?? new Array(12).fill(0)).map((v, i) => <i key={i} style={{ height: `${Math.max(3, (v / max) * 100)}%` }}><span>{v || ""}</span></i>)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--pw-muted)", marginTop: 6 }}><span>12 weeks ago</span><span>This week</span></div>
        </section>
        <section className="pw-card">
          <h2>Breakdown</h2>
          <table className="pw-table">
            <thead><tr><th>Event</th><th>30 days</th><th>90 days</th></tr></thead>
            <tbody>{ROWS.map(([k, l]) => <tr key={k}><td>{l}</td><td style={{ textAlign: "right" }}>{a?.totals30[k] ?? 0}</td><td>{a?.totals90[k] ?? 0}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
