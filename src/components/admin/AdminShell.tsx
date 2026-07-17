"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV: [string, string, string?][] = [
  ["/admin", "Dashboard"],
  ["/admin/reservations", "Reservations", "reservations_open"],
  ["/admin/members", "Members"],
  ["/admin/experts", "Experts", "experts_new"],
  ["/admin/partners", "Partners", "partners_new"],
  ["/admin/free-kit", "Free kit"],
  ["/admin/admins", "Admin team"],
  ["/admin/audit-log", "Audit log"],
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

  // Pending-count badges, refreshed every 90s.
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
          <span className="mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/vsn-appicon.png" alt="VSN" width={44} height={44} />
          </span>
          <span>
            <strong>VSN Admin</strong>
            <small>Waitlist phase console</small>
          </span>
        </Link>
        <div className="tag">Launch waitlist</div>
        <nav>
          {NAV.map(([href, label, countKey]) => {
            const n = countKey ? counts[countKey] : undefined;
            return (
              <Link key={href} href={href} className={`adm-link${pathname === href ? " on" : ""}`}>
                {label}
                {typeof n === "number" && n > 0 && <span className="cnt">{n}</span>}
              </Link>
            );
          })}
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
