"use client";

import { useEffect, useState } from "react";
import { usePartner, api } from "@/components/partner/PartnerContext";

type Ref = { code: string; slug: string | null; link: string; payoutUsd: number; signupsLifetime: number; signupsLast30: number; conversions: number };

export default function PartnerReferralsPage() {
  const { me } = usePartner();
  const [ref, setRef] = useState<Ref | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { api<Ref>("/api/partner/referral").then((r) => r.ok && setRef(r.data)); }, []);
  if (!me) return null;
  const copy = (k: string, v: string) => { navigator.clipboard?.writeText(v); setCopied(k); setTimeout(() => setCopied(null), 1500); };
  return (
    <div className="pw-grid c2">
      <section className="pw-card">
        <h2>Your referral link</h2>
        <p className="lead">Share it with the practices you already serve. You earn ${ref?.payoutUsd ?? 50} once a referred member makes their first payment. No cap.</p>
        {ref ? (
          <>
            <div className="pw-field"><label>Vanity link</label><div className="pw-copy"><code>{ref.link}</code><button className="pw-btn ghost sm" onClick={() => copy("l", ref.link)}>{copied === "l" ? "Copied" : "Copy"}</button></div></div>
            <div className="pw-field"><label>Referral code</label><div className="pw-copy"><code>{ref.code}</code><button className="pw-btn ghost sm" onClick={() => copy("c", ref.code)}>{copied === "c" ? "Copied" : "Copy"}</button></div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="pw-btn ghost sm" href={`mailto:?subject=${encodeURIComponent("Veterinary Success Network")}&body=${encodeURIComponent(`We're a founding partner of the Veterinary Success Network. Practice owners get a written action plan for every problem and member-only deals, including ours. Join here: ${ref.link}`)}`}>Share by email</a>
              <a className="pw-btn ghost sm" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ref.link)}`} target="_blank" rel="noreferrer">Share on LinkedIn</a>
            </div>
          </>
        ) : <div className="pw-empty">Preparing your link…</div>}
      </section>
      <div className="pw-grid" style={{ gap: 18, alignContent: "start" }}>
        <div className="pw-grid c3">
          <div className="pw-card pw-stat"><span className="k">Signups</span><span className="v">{ref?.signupsLifetime ?? 0}</span><span className="d">lifetime</span></div>
          <div className="pw-card pw-stat"><span className="k">Last 30 days</span><span className="v">{ref?.signupsLast30 ?? 0}</span><span className="d">new</span></div>
          <div className="pw-card pw-stat"><span className="k">Paid</span><span className="v">{ref?.conversions ?? 0}</span><span className="d">${(ref?.conversions ?? 0) * (ref?.payoutUsd ?? 50)} earned</span></div>
        </div>
        <section className="pw-card">
          <h2>How it works</h2>
          <ul className="pw-check">
            <li className="done"><span className="tk">1</span>A practice owner opens your link. The referral is remembered for 90 days.</li>
            <li className="done"><span className="tk">2</span>They join the network (waitlist now, membership at launch).</li>
            <li className="done"><span className="tk">3</span>After their first payment, ${ref?.payoutUsd ?? 50} is credited to you. The team pays out monthly.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
