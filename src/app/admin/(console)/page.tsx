"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";

type Overview = {
  launchEnabled?: boolean;
  counts: Record<string, number>;
  recent: {
    reservations: any[];
    experts: any[];
    partners: any[];
    freeKit: any[];
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setErr(true)))
      .catch(() => setErr(true));
  }, []);

  const c = data?.counts || {};

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p>The waitlist phase at a glance: reservations, applications and free-kit leads.</p>
        </div>
      </div>
      {err && <div className="adm-msg show err">Couldn&apos;t load the overview. Is Supabase configured?</div>}

      {data && (
        <div className="adm-launch">
          <span>Member launch is <b>{data.launchEnabled ? "ON" : "OFF"}</b>. {data.launchEnabled ? "Members can be invited from the waitlist page." : "Members get nothing beyond the waitlist confirmation until you flip MEMBER_LAUNCH_ENABLED in Vercel."}</span>
          <Link className="adm-btn lime" href="/admin/reservations">Open the waitlist</Link>
        </div>
      )}

      <div className="adm-stats">
        <div className={`adm-stat${(c.kits_pending ?? 0) + (c.catalog_pending ?? 0) + (c.offers_pending ?? 0) > 0 ? " alert" : ""}`}>
          <div className="v">{(c.kits_pending ?? 0) + (c.catalog_pending ?? 0) + (c.offers_pending ?? 0)}</div>
          <div className="t">Awaiting review</div>
          <div className="s">{c.kits_pending ?? 0} kits · {c.catalog_pending ?? 0} catalog · {c.offers_pending ?? 0} offers</div>
        </div>
        <div className={`adm-stat${(c.inquiries_open ?? 0) > 0 ? " alert" : ""}`}>
          <div className="v">{c.inquiries_open ?? 0}</div>
          <div className="t">Open inquiries</div>
          <div className="s">waiting on an expert or partner</div>
        </div>
        <div className="adm-stat">
          <div className="v">{c.experts_live ?? 0}</div>
          <div className="t">Live experts</div>
          <div className="s">{c.experts_founding ?? 0} lifetime free of 20</div>
        </div>
        <div className="adm-stat">
          <div className="v">{c.partners_live ?? 0}</div>
          <div className="t">Live partners</div>
          <div className="s">{c.founding_invites_sent ?? 0} founding invites out · {c.referrals_due ?? 0} referral payouts due</div>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="v">{c.reservations_total ?? "…"}</div>
          <div className="t">Member reservations</div>
          <div className="s">{c.reservations_open ?? 0} still reserved · first 100 lock $29</div>
        </div>
        <div className="adm-stat">
          <div className="v">{c.members_total ?? "…"}</div>
          <div className="t">Founding members</div>
          <div className="s">{c.members_active ?? 0} active</div>
        </div>
        <div className="adm-stat">
          <div className="v">{c.experts_total ?? "…"}</div>
          <div className="t">Expert applications</div>
          <div className="s">{c.experts_new ?? 0} awaiting review</div>
        </div>
        <div className="adm-stat">
          <div className="v">{c.partners_total ?? "…"}</div>
          <div className="t">Partner applications</div>
          <div className="s">{c.partners_new ?? 0} awaiting review</div>
        </div>
        <div className="adm-stat">
          <div className="v">{c.free_kit_total ?? "…"}</div>
          <div className="t">Free-kit leads</div>
          <div className="s">lead magnet list</div>
        </div>
      </div>

      <div className="adm-card">
        <div className="hd">
          <h2>Latest reservations</h2>
          <Link className="adm-btn" href="/admin/reservations">Open reservations →</Link>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>Spot</th><th>Name</th><th>Practice</th><th>Plan</th><th>Status</th><th>When</th></tr>
            </thead>
            <tbody>
              {(data?.recent.reservations || []).map((r) => (
                <tr key={r.id}>
                  <td className="em">#{r.position}</td>
                  <td>{r.full_name}</td>
                  <td>{r.practice_name}</td>
                  <td>{r.plan}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
              {data && data.recent.reservations.length === 0 && (
                <tr><td colSpan={6}><div className="adm-empty">No reservations yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="hd">
          <h2>Latest expert applications</h2>
          <Link className="adm-btn" href="/admin/experts">Review experts →</Link>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>Name</th><th>Company</th><th>Status</th><th>When</th></tr>
            </thead>
            <tbody>
              {(data?.recent.experts || []).map((r) => (
                <tr key={r.id}>
                  <td className="em">{r.full_name}</td>
                  <td>{r.company || "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
              {data && data.recent.experts.length === 0 && (
                <tr><td colSpan={4}><div className="adm-empty">No applications yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="hd">
          <h2>Latest partner applications</h2>
          <Link className="adm-btn" href="/admin/partners">Review partners →</Link>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>Company</th><th>Category</th><th>Status</th><th>When</th></tr>
            </thead>
            <tbody>
              {(data?.recent.partners || []).map((r) => (
                <tr key={r.id}>
                  <td className="em">{r.company_name}</td>
                  <td>{r.category}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
              {data && data.recent.partners.length === 0 && (
                <tr><td colSpan={4}><div className="adm-empty">No applications yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="hd">
          <h2>Latest free-kit leads</h2>
          <Link className="adm-btn" href="/admin/free-kit">Open the list →</Link>
        </div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>Name</th><th>Practice</th><th>Status</th><th>When</th></tr>
            </thead>
            <tbody>
              {(data?.recent.freeKit || []).map((r) => (
                <tr key={r.id}>
                  <td className="em">{r.full_name}</td>
                  <td>{r.practice_name || "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
              {data && data.recent.freeKit.length === 0 && (
                <tr><td colSpan={4}><div className="adm-empty">No leads yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
