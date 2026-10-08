"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePartner, api } from "@/components/partner/PartnerContext";

type Ref = { link: string; signupsLifetime: number; conversions: number; payoutUsd: number };

const Ic = {
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  inbox: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H8l-4 4z" /></svg>,
  tag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12l-8 8-9-9V4h7l10 8z" /></svg>,
  gift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>,
  box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16v13H4zM9 7V4h6v3" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14" /></svg>,
};

export default function PartnerOverview() {
  const { me } = usePartner();
  const [ref, setRef] = useState<Ref | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api<Ref>("/api/partner/referral").then((r) => r.ok && setRef(r.data)); }, []);
  if (!me) return null;
  const p = me.partner;
  const name = p.display_name || p.company_name;
  const done = me.checklist.filter((c) => c.done).length;
  const pct = Math.round((done / Math.max(1, me.checklist.length)) * 100);
  const next = me.checklist.find((c) => !c.done);

  return (
    <div className="pw-grid" style={{ gap: 18 }}>
      <section className="pw-hero">
        <div>
          <div className="pw-hero-eyebrow"><i />{me.listable ? "Listing live" : "Setup in progress"}</div>
          <h2>{me.listable ? `${name} is live in the directory.` : `Let's get ${name} in front of members.`}</h2>
          <p>
            {me.listable
              ? "Members can find you, read your offer and contact you. Keep offers current and answer inquiries within one business day to stay high in the shortlist."
              : next
                ? `Next step: ${next.label.toLowerCase()}. Your listing goes live with the Verified Partner badge once the checklist is complete.`
                : "Everything is in. The team is reviewing your listing."}
          </p>
          <div className="acts">
            {next ? <Link className="pw-btn amber" href={next.href}>{next.label}</Link> : <Link className="pw-btn amber" href="/partner/offers">Add an offer</Link>}
            {me.listable && <Link className="pw-btn outline" href={`/partners/${p.id}`} target="_blank">View public listing</Link>}
            {!me.listable && <Link className="pw-btn outline" href="/partner/profile">Edit company profile</Link>}
          </div>
        </div>
        <div className="pw-ring" style={{ ["--pct" as string]: `${pct}%` }}>
          <div className="circle"><b>{pct}%</b></div>
          <ul>
            {me.checklist.map((c) => (
              <li key={c.key} className={c.done ? "done" : undefined}><i>{c.done ? "✓" : ""}</i>{c.label}{!c.done && <Link href={c.href}>Do it</Link>}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pw-grid c4">
        <div className="pw-tile"><span className="k">{Ic.eye}Profile views<span className="trend">30 days</span></span><span className="v">{me.counts.views30}</span><span className="d">people who opened your listing</span></div>
        <div className="pw-tile"><span className="k">{Ic.inbox}Open inquiries</span><span className="v">{me.counts.openInquiries}</span><span className="d">of {me.counts.inquiries} total · reply within 1 business day</span></div>
        <div className="pw-tile light"><span className="k">{Ic.tag}Live offers</span><span className="v">{me.counts.offers}</span><span className="d">{me.counts.catalog} catalog item{me.counts.catalog === 1 ? "" : "s"}</span></div>
        <div className="pw-tile light"><span className="k">{Ic.gift}Redemptions</span><span className="v">{me.counts.redemptions}</span><span className="d">{ref ? `${ref.signupsLifetime} referral signup${ref.signupsLifetime === 1 ? "" : "s"}` : "members who used an offer"}</span></div>
      </div>

      <div className="pw-quick">
        <Link href="/partner/offers"><span className="ic">{Ic.plus}</span><span><b>Create an offer</b><span>Member-only deal with a code or link</span></span></Link>
        <Link href="/partner/catalog"><span className="ic">{Ic.box}</span><span><b>Add a catalog item</b><span>A service or product members can browse</span></span></Link>
        <Link href="/partner/profile"><span className="ic">{Ic.user}</span><span><b>Update company profile</b><span>Logo, description, booking link</span></span></Link>
      </div>

      <div className="pw-grid c2">
        <section className="pw-terms">
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 18, color: "var(--pw-deep)", margin: "0 0 6px", fontWeight: 600 }}>Your terms</h2>
          <p className="lead" style={{ fontSize: 13.5, color: "var(--pw-muted)", margin: "0 0 10px", lineHeight: 1.55 }}>{me.billing.terms}</p>
          <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.55 }}><b style={{ color: "var(--pw-deep)" }}>{me.billing.label}.</b> {me.billing.detail}{me.billing.provisional && " The launch date is not set yet, so the free period shown is provisional."}</p>
          <Link className="pw-btn ghost sm" href="/partner/account" style={{ marginTop: 14 }}>Account &amp; billing</Link>
        </section>
        <section className="pw-card">
          <h2>Referral link</h2>
          <p className="lead">Share with practice owners. ${ref?.payoutUsd ?? 50} after each referred member&apos;s first payment.</p>
          {ref ? (
            <div className="pw-copy">
              <code>{ref.link}</code>
              <button className="pw-btn primary sm" onClick={() => { navigator.clipboard?.writeText(ref.link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</button>
            </div>
          ) : <div className="pw-empty" style={{ padding: 10 }}>Preparing…</div>}
          {me.covered.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--pw-line)" }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--pw-muted)", marginBottom: 8 }}>Covered companies</div>
              {me.covered.map((c) => <div key={c.id} style={{ fontSize: 13.5, padding: "4px 0" }}><b style={{ color: "var(--pw-deep)" }}>{c.company_name}</b> <span style={{ color: "var(--pw-muted)" }}>· {c.category || "No category yet"}</span></div>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
