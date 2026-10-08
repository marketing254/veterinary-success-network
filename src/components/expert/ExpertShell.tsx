"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExpertProvider, useExpert, initials, timeAgo } from "./ExpertContext";

const I = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>,
  kit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16v13H4zM9 7V4h6v3M4 12h16" /></svg>,
  feed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16M4 12h10M4 19h16" /></svg>,
  inbox: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v16H4z" /><path d="M4 14h5l1 2h4l1-2h5" /></svg>,
  gift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9c-3 0-5-1-5-3s2-2 3-1 2 4 2 4zm0 0c3 0 5-1 5-3s-2-2-3-1-2 4-2 4z" /></svg>,
  card: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  cog: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1L14.5 3h-5l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.6h5l.3-2.6a7 7 0 001.7-1l2.4 1 2-3.5-2-1.5a7 7 0 00.1-1z" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0" /></svg>,
  burger: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

const NAV: { href: string; label: string; icon: keyof typeof I; badge?: "openInquiries" }[] = [
  { href: "/expert", label: "Dashboard", icon: "home" },
  { href: "/expert/profile", label: "Profile", icon: "user" },
  { href: "/expert/agreement", label: "Agreement", icon: "doc" },
  { href: "/expert/resources", label: "Kits", icon: "kit" },
  { href: "/expert/feed", label: "Network feed", icon: "feed" },
  { href: "/expert/inquiries", label: "Inquiries", icon: "inbox", badge: "openInquiries" },
  { href: "/expert/referrals", label: "Referrals", icon: "gift" },
  { href: "/expert/billing", label: "Billing", icon: "card" },
  { href: "/expert/settings", label: "Settings", icon: "cog" },
];

const TITLES: Record<string, [string, string]> = {
  "/expert": ["Dashboard", "Your bench at a glance"],
  "/expert/profile": ["Profile", "What members see when they find you"],
  "/expert/agreement": ["Expert agreement", "Your terms, in plain language"],
  "/expert/resources": ["Kits", "Share a recording or a document; we brand it for members"],
  "/expert/feed": ["Network feed", "Updates from the network's experts and partners"],
  "/expert/inquiries": ["Inquiries", "Member questions routed to you"],
  "/expert/referrals": ["Referrals", "Earn $50 for every member you bring in"],
  "/expert/billing": ["Billing", "Free founding months, then a flat rate"],
  "/expert/settings": ["Settings", "Sign-in, notifications and your account"],
};

function pillFor(state: string): { cls: string; text: string } {
  switch (state) {
    case "exempt": return { cls: "good", text: "Founding expert · lifetime free" };
    case "bypass": return { cls: "info", text: "Preview account" };
    case "unsigned": return { cls: "warn", text: "Agreement pending" };
    case "awaiting_card":
    case "free_months": return { cls: "good", text: "Free founding months" };
    case "active": return { cls: "good", text: "Active" };
    case "past_due": return { cls: "bad", text: "Payment due" };
    case "paused": return { cls: "bad", text: "Paused" };
    default: return { cls: "info", text: state };
  }
}

type Notif = { id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

function Bell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications?audience=expert", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setRows(d.rows);
        setUnread(d.unread);
      }
    } catch {
      /* best effort */
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 90_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true, audience: "expert" }) });
    load();
  }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="xp-bell" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        {I.bell}
        {unread > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="xp-bellmenu">
          <div className="hd">
            <span>Notifications</span>
            {unread > 0 && <button onClick={markAll}>Mark all read</button>}
          </div>
          {rows.length === 0 ? (
            <div className="empty">Nothing yet. Member inquiries and kit reviews show up here.</div>
          ) : (
            rows.map((n) => (
              <Link key={n.id} href={n.link || "/expert"} className={`it${n.read_at ? "" : " unread"}`} onClick={() => setOpen(false)}>
                <b>{n.title}</b>
                {n.body && <span>{n.body}</span>}
                <span> · {timeAgo(n.created_at)}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, error } = useExpert();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [pathname]);

  const [title, sub] = TITLES[pathname] || ["Expert portal", ""];
  const e = me?.expert;
  const name = e?.display_name || e?.full_name || "";
  const pill = me ? pillFor(me.billing.state) : null;

  async function signOut() {
    await fetch("/api/expert/logout", { method: "POST" });
    router.replace("/expert/login");
    router.refresh();
  }

  return (
    <div className={`xp${navOpen ? " nav-open" : ""}`}>
      {navOpen && <div className="xp-scrim" onClick={() => setNavOpen(false)} />}
      <aside className="xp-side">
        <Link href="/expert" className="xp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/vsn-monogram-dark.png" alt="VSN" />
          <span>
            <strong>Veterinary Success Network</strong>
            <small>Expert portal</small>
          </span>
        </Link>
        <div className="xp-navlabel">Workspace</div>
        <nav className="xp-nav">
          {NAV.map((n) => {
            const on = n.href === "/expert" ? pathname === "/expert" : pathname.startsWith(n.href);
            const badge = n.badge && me ? me.counts[n.badge] : 0;
            return (
              <Link key={n.href} href={n.href} className={on ? "on" : undefined}>
                {I[n.icon]}
                {n.label}
                {badge ? <span className="badge">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="xp-side-foot">
          {me?.dual && (
            <Link href="/partner" className="xp-switch">
              <span>You also have a partner account. <b>Switch to the partner portal</b></span>
            </Link>
          )}
          <div className="xp-user" style={{ marginTop: 10 }}>
            <div className="xp-avatar">
              {e?.avatar_url || e?.headshot_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.avatar_url || e.headshot_url || ""} alt="" />
              ) : (
                initials(name)
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <b>{name || "Expert"}</b>
              <span>{e?.specialty || e?.email || ""}</span>
            </div>
          </div>
          <button className="xp-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <div className="xp-main">
        <header className="xp-top">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="xp-burger" aria-label="Menu" onClick={() => setNavOpen(true)}>{I.burger}</button>
            <div>
              <h1>{title}</h1>
              {sub && <div className="sub">{sub}</div>}
            </div>
          </div>
          <div className="xp-top-actions">
            {pill && <span className={`xp-pill ${pill.cls}`}><i />{pill.text}</span>}
            <Bell />
          </div>
        </header>
        <main className="xp-body">
          {loading && !me ? (
            <div className="xp-empty">Loading your bench…</div>
          ) : error && !me ? (
            <div className="xp-msg err">{error}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default function ExpertShell({ children }: { children: React.ReactNode }) {
  return (
    <ExpertProvider>
      <Shell>{children}</Shell>
    </ExpertProvider>
  );
}
