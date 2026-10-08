"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Item = [string, string, string?];
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Overview", items: [["/admin", "Dashboard"]] },
  {
    label: "People",
    items: [
      ["/admin/reservations", "Member waitlist", "reservations_open"],
      ["/admin/members", "Members"],
      ["/admin/experts", "Expert applications", "experts_new"],
      ["/admin/experts-live", "Experts"],
      ["/admin/partners", "Partner applications", "partners_new"],
      ["/admin/partners-live", "Partners"],
      ["/admin/founding", "Founding invites", "founding_invites_sent"],
      ["/admin/invite-links", "Invite links"],
      ["/admin/free-kit", "Free-kit leads"],
    ],
  },
  {
    label: "Content review",
    items: [
      ["/admin/kits", "Expert kits", "kits_pending"],
      ["/admin/catalog", "Partner catalog", "catalog_pending"],
      ["/admin/offers", "Partner offers", "offers_pending"],
      ["/admin/broadcast", "Network feed"],
    ],
  },
  {
    label: "Engagement",
    items: [
      ["/admin/inquiries", "Inquiries", "inquiries_open"],
      ["/admin/redemptions", "Redemptions"],
      ["/admin/referrals", "Referrals", "referrals_due"],
    ],
  },
  {
    label: "System",
    items: [
      ["/admin/email-previews", "Email drafts"],
      ["/admin/admins", "Admin team"],
      ["/admin/stripe-status", "Stripe status"],
      ["/admin/audit-log", "Audit log"],
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; name: string; role: string } | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setMe(d.admin))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  useEffect(() => {
    let alive = true;
    async function loadCounts() {
      try {
        const res = await fetch("/api/admin/overview");
        const d = await res.json();
        if (alive && d.ok) setCounts(d.counts || {});
      } catch {
        /* badge refresh is best-effort */
      }
    }
    loadCounts();
    const t = setInterval(loadCounts, 90_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link className="brand" href="/admin">
          <span className="mark mono">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/vsn-monogram-dark.png" alt="VSN" />
          </span>
          <span>
            <strong>VSN Admin</strong>
            <small>Network console</small>
          </span>
        </Link>
        <nav>
          {GROUPS.map((g) => (
            <div key={g.label} style={{ display: "contents" }}>
              <div className="adm-group">{g.label}</div>
              {g.items.map(([href, label, countKey]) => {
                const n = countKey ? counts[countKey] : undefined;
                const on = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className={`adm-link${on ? " on" : ""}`}>
                    {label}
                    {typeof n === "number" && n > 0 && <span className="cnt">{n}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-me">
          {me ? (
            <>
              <b>{me.name}</b>
              {me.email} · {me.role}
              <br />
              <button onClick={signOut}>Sign out</button>
            </>
          ) : (
            "…"
          )}
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
