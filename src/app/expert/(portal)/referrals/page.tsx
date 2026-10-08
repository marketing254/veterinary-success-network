"use client";

import { useEffect, useState } from "react";
import { useExpert, api } from "@/components/expert/ExpertContext";

type Ref = { code: string; slug: string | null; link: string; codeLink: string; payoutUsd: number; signupsLifetime: number; signupsLast30: number; conversions: number };

export default function ExpertReferralsPage() {
  const { me } = useExpert();
  const [ref, setRef] = useState<Ref | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api<Ref>("/api/expert/referral").then((r) => r.ok && setRef(r.data));
  }, []);

  if (!me) return null;
  const copy = (k: string, v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };
  const share = ref ? encodeURIComponent(`I'm an expert on the Veterinary Success Network. Practice owners get a written action plan for every problem, plus member-only deals. Join here: ${ref.link}`) : "";

  return (
    <div className="xp-grid c2">
      <section className="xp-card">
        <h2>Your referral link</h2>
        <p className="lead">Every member who joins through your link is credited to you. You earn ${ref?.payoutUsd ?? 50} once they make their first payment. No cap.</p>
        {ref ? (
          <>
            <div className="xp-field">
              <label>Vanity link</label>
              <div className="xp-copy"><code>{ref.link}</code><button className="xp-btn ghost sm" onClick={() => copy("link", ref.link)}>{copied === "link" ? "Copied" : "Copy"}</button></div>
            </div>
            <div className="xp-field">
              <label>Referral code <small>works on the join form too</small></label>
              <div className="xp-copy"><code>{ref.code}</code><button className="xp-btn ghost sm" onClick={() => copy("code", ref.code)}>{copied === "code" ? "Copied" : "Copy"}</button></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <a className="xp-btn ghost sm" href={`mailto:?subject=${encodeURIComponent("Veterinary Success Network")}&body=${share}`}>Share by email</a>
              <a className="xp-btn ghost sm" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ref.link)}`} target="_blank" rel="noreferrer">Share on LinkedIn</a>
            </div>
          </>
        ) : (
          <div className="xp-empty">Preparing your link…</div>
        )}
      </section>
      <div className="xp-grid" style={{ gap: 18, alignContent: "start" }}>
        <div className="xp-grid c3">
          <div className="xp-card xp-stat"><span className="k">Signups</span><span className="v">{ref?.signupsLifetime ?? 0}</span><span className="d">lifetime</span></div>
          <div className="xp-card xp-stat"><span className="k">Last 30 days</span><span className="v">{ref?.signupsLast30 ?? 0}</span><span className="d">new signups</span></div>
          <div className="xp-card xp-stat"><span className="k">Paid</span><span className="v">{ref?.conversions ?? 0}</span><span className="d">${(ref?.conversions ?? 0) * (ref?.payoutUsd ?? 50)} earned</span></div>
        </div>
        <section className="xp-card">
          <h2>How it works</h2>
          <ul className="xp-check">
            <li><span className="tk done" style={{ background: "var(--xp-green)", borderColor: "var(--xp-green)" }}>1</span>A practice owner opens your link. We remember the referral for 90 days.</li>
            <li><span className="tk" style={{ background: "var(--xp-green)", borderColor: "var(--xp-green)" }}>2</span>They join the network (waitlist now, membership at launch).</li>
            <li><span className="tk" style={{ background: "var(--xp-green)", borderColor: "var(--xp-green)" }}>3</span>After their first payment, ${ref?.payoutUsd ?? 50} is credited to you. The team pays out monthly.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
