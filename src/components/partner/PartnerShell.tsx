"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PartnerProvider, usePartner, initials, timeAgo } from "./PartnerContext";

const I = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></svg>,
  company: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg>,
  catalog: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16v13H4zM9 7V4h6v3M4 12h16" /></svg>,
  offers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12l-8 8-9-9V4h7l10 8z" /><circle cx="8" cy="8" r="1.5" /></svg>,
  inquiries: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v12H8l-4 4z" /><path d="M8 9h8M8 12h5" /></svg>,
  analytics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  redemptions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12" /></svg>,
  referrals: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-4 3-6 7-6s7 2 7 6M17 8h5M19.5 5.5v5" /></svg>,
  account: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  agreement: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0" /></svg>,
  burger: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

type Item = { href: string; label: string; icon: keyof typeof I; badge?: "openInquiries" };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Workspace", items: [{ href: "/partner", label: "Overview", icon: "overview" }, { href: "/partner/profile", label: "Company", icon: "company" }, { href: "/partner/catalog", label: "Catalog", icon: "catalog" }, { href: "/partner/offers", label: "Offers", icon: "offers" }] },
  { label: "Growth", items: [{ href: "/partner/inquiries", label: "Inquiries", icon: "inquiries", badge: "openInquiries" }, { href: "/partner/analytics", label: "Analytics", icon: "analytics" }, { href: "/partner/redemptions", label: "Redemptions", icon: "redemptions" }, { href: "/partner/referrals", label: "Referrals", icon: "referrals" }] },
  { label: "Account", items: [{ href: "/partner/account", label: "Account & billing", icon: "account" }, { href: "/partner/agreement", label: "Agreement", icon: "agreement" }] },
];

const TITLES: Record<string, [string, string, string]> = {
  "/partner": ["Workspace", "Overview", "Your listing, leads and offers at a glance"],
  "/partner/profile": ["Workspace", "Company profile", "What members see in the partner directory"],
  "/partner/catalog": ["Workspace", "Catalog", "The services and products you want members to find"],
  "/partner/offers": ["Workspace", "Member offers", "Exclusive deals members can only get through VSN"],
  "/partner/inquiries": ["Growth", "Inquiries", "Member questions routed to your company"],
  "/partner/analytics": ["Growth", "Analytics", "Views, clicks, inquiries and redemptions"],
  "/partner/redemptions": ["Growth", "Redemptions", "Members who used your offers"],
  "/partner/referrals": ["Growth", "Referrals", "Earn $50 for every member you bring in"],
  "/partner/account": ["Account", "Account & billing", "Your terms, contacts and covered companies"],
  "/partner/agreement": ["Account", "Partner agreement", "Your terms, in plain language"],
};

function pillFor(state: string): { cls: string; text: string } {
  switch (state) {
    case "house": return { cls: "good", text: "House partner" };
    case "bypass": return { cls: "info", text: "Preview account" };
    case "covered": return { cls: "good", text: "Covered listing" };
    case "not_approved": return { cls: "warn", text: "Pending review" };
    case "unsigned": return { cls: "warn", text: "Agreement pending" };
    case "awaiting_card":
    case "free_months": return { cls: "good", text: "Free founding months" };
    case "active": return { cls: "good", text: "Active" };
    case "past_due": return { cls: "bad", text: "Payment due" };
    case "paused": return { cls: "bad", text: "Paused" };
    default: return { cls: "info", text: state };
  }
}

type Notif = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

function useOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return ref;
}

function Bell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useOutside(() => setOpen(false));
  async function load() {
    try {
      const r = await fetch("/api/notifications?audience=partner", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) { setRows(d.rows); setUnread(d.unread); }
    } catch { /* best effort */ }
  }
  useEffect(() => { load(); const t = setInterval(load, 90_000); return () => clearInterval(t); }, []);
  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true, audience: "partner" }) });
    load();
  }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="pw-icon" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>{I.bell}{unread > 0 && <span className="dot" />}</button>
      {open && (
        <div className="pw-menu">
          <div className="hd"><span>Notifications</span>{unread > 0 && <button onClick={markAll}>Mark all read</button>}</div>
          {rows.length === 0 ? <div className="empty">Nothing yet. Inquiries and review decisions show up here.</div> : rows.map((n) => (
            <Link key={n.id} href={n.link || "/partner"} className={`it${n.read_at ? "" : " unread"}`} onClick={() => setOpen(false)}>
              <b>{n.title}</b>{n.body && <span>{n.body}</span>}<span> · {timeAgo(n.created_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, error } = usePartner();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [pathname]);
  const [crumb, title, sub] = TITLES[pathname] || ["Workspace", "Partner portal", ""];
  const pill = me ? pillFor(me.billing.state) : null;
  const p = me?.partner;

  async function signOut() {
    await fetch("/api/partner/logout", { method: "POST" });
    router.replace("/partner/login");
    router.refresh();
  }

  return (
    <div className={`pw${navOpen ? " nav-open" : ""}`}>
      {navOpen && <div className="pw-scrim" onClick={() => setNavOpen(false)} />}
      <aside className="pw-side">
        <div className="pw-rail">
          <Link href="/partner" className="pw-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/vsn-monogram-dark.png" alt="VSN" />
            <span><strong>Veterinary Success Network</strong><small>Partner portal</small></span>
          </Link>
          <nav className="pw-nav">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <div className="pw-group">{g.label}</div>
                {g.items.map((t) => {
                  const on = t.href === "/partner" ? pathname === "/partner" : pathname.startsWith(t.href);
                  const badge = t.badge && me ? me.counts[t.badge] : 0;
                  return (
                    <Link key={t.href} href={t.href} className={on ? "on" : undefined}>
                      <span className="ic">{I[t.icon]}</span>{t.label}{badge ? <span className="badge">{badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="pw-side-foot">
            <div className="pw-company">
              <div className="pw-logo">{p?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logo_url} alt="" />
              ) : initials(p?.company_name)}</div>
              <div style={{ minWidth: 0 }}><b>{p?.display_name || p?.company_name || "Partner"}</b><span>{p?.contact_email || ""}</span></div>
            </div>
            {me?.dual && <Link href="/expert" className="pw-switch">You also have an expert account. <b>Switch to the expert portal</b></Link>}
            <button className="pw-signout" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="pw-main">
        <header className="pw-topbar">
          <div className="in">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="pw-burger" aria-label="Menu" onClick={() => setNavOpen(true)}>{I.burger}</button>
              <div><div className="crumb">{crumb}</div><h1>{title}</h1></div>
            </div>
            <div className="pw-top-actions">
              {pill && <span className={`pw-pill ${pill.cls}`}><i />{pill.text}</span>}
              <Bell />
              {me?.listable && <Link className="pw-btn ghost sm" href={`/partners/${p?.id}`} target="_blank">View listing</Link>}
            </div>
          </div>
        </header>
        <section className="pw-band">
          <div className="in">
            <div className="sub">{sub}</div>
            {me?.partner.verified && <span className="pw-verified" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>Verified Partner</span>}
          </div>
        </section>
        <main className="pw-body">
          {loading && !me ? <div className="pw-card pw-empty">Loading your workspace…</div> : error && !me ? <div className="pw-msg err">{error}</div> : children}
        </main>
      </div>
    </div>
  );
}

export default function PartnerShell({ children }: { children: React.ReactNode }) {
  return (
    <PartnerProvider>
      <Shell>{children}</Shell>
    </PartnerProvider>
  );
}
