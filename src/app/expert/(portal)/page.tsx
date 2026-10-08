"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useExpert, api } from "@/components/expert/ExpertContext";

type Ref = { code: string; link: string; signupsLifetime: number; conversions: number; payoutUsd: number };

export default function ExpertDashboard() {
  const { me } = useExpert();
  const [ref, setRef] = useState<Ref | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Ref>("/api/expert/referral").then((r) => r.ok && setRef(r.data));
  }, []);

  if (!me) return null;
  const e = me.expert;
  const first = (e.display_name || e.full_name).split(/\s+/)[0];
  const done = me.checklist.filter((c) => c.done).length;
  const pct = Math.round((done / me.checklist.length) * 100);
  const nextStep = me.checklist.find((c) => !c.done);

  return (
    <div className="xp-grid" style={{ gap: 18 }}>
      <section className="xp-card xp-hero">
        <h2>Welcome back, {first}.</h2>
        <p>
          {me.listable
            ? "Your profile is live for members. Keep your kits and feed fresh, and answer inquiries within a business day to stay high in hotline routing."
            : nextStep
              ? `You are ${pct}% set up. Next: ${nextStep.label.toLowerCase()}. Once your agreement, headshot and bio are in, your public listing goes live.`
              : "Your profile is complete and waiting for the team's review."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {nextStep ? (
            <Link className="xp-btn lime" href={nextStep.href}>{nextStep.label}</Link>
          ) : (
            <Link className="xp-btn lime" href="/expert/resources">Submit a kit</Link>
          )}
          {me.listable && (
            <Link className="xp-btn ghost" href={`/experts/${e.id}`} target="_blank">View public profile</Link>
          )}
          {me.onboardingCallUrl && (
            <a className="xp-btn ghost" href={me.onboardingCallUrl} target="_blank" rel="noreferrer">Book onboarding call</a>
          )}
        </div>
      </section>

      <div className="xp-grid c4">
        <div className="xp-card xp-stat"><span className="k">Kits</span><span className="v">{me.counts.kits}</span><span className="d">submitted to the library</span></div>
        <div className="xp-card xp-stat"><span className="k">Feed posts</span><span className="v">{me.counts.posts}</span><span className="d">published to the network</span></div>
        <div className="xp-card xp-stat"><span className="k">Open inquiries</span><span className="v">{me.counts.openInquiries}</span><span className="d">of {me.counts.inquiries} total</span></div>
        <div className="xp-card xp-stat"><span className="k">Referrals</span><span className="v">{ref?.signupsLifetime ?? 0}</span><span className="d">{ref?.conversions ?? 0} paid · ${ref?.payoutUsd ?? 50} each</span></div>
      </div>

      <div className="xp-grid c2">
        <section className="xp-card">
          <h2>Setup checklist</h2>
          <p className="lead">{done} of {me.checklist.length} done. A complete profile is what unlocks your public listing.</p>
          <div className="xp-progress"><i style={{ width: `${pct}%` }} /></div>
          <ul className="xp-check">
            {me.checklist.map((c) => (
              <li key={c.key} className={c.done ? "done" : undefined}>
                <span className="tk">{c.done ? "✓" : ""}</span>
                {c.label}
                {!c.done && <Link href={c.href}>Do it</Link>}
              </li>
            ))}
          </ul>
        </section>

        <div className="xp-grid" style={{ gap: 18 }}>
          <section className="xp-card">
            <h2>Your terms</h2>
            <p className="lead">{me.billing.terms}</p>
            <p className="lead" style={{ margin: 0 }}>
              <b style={{ color: "var(--xp-side)" }}>{me.billing.label}.</b> {me.billing.detail}
              {me.billing.provisional && " The launch date is not set yet, so the free period shown is provisional."}
            </p>
            <Link className="xp-btn ghost sm" href="/expert/billing" style={{ marginTop: 14 }}>Billing details</Link>
          </section>

          <section className="xp-card">
            <h2>Your referral link</h2>
            <p className="lead">Share it with practice owners. You earn ${ref?.payoutUsd ?? 50} after each referred member&apos;s first payment.</p>
            {ref ? (
              <div className="xp-copy">
                <code>{ref.link}</code>
                <button
                  className="xp-btn ghost sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(ref.link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <div className="xp-empty" style={{ padding: 10 }}>Preparing your link…</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
