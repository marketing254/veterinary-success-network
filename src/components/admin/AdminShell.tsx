"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PawMark } from "@/components/Brand";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/reservations", "Reservations"],
  ["/admin/experts", "Experts"],
  ["/admin/partners", "Partners"],
  ["/admin/free-kit", "Free kit"],
  ["/admin/admins", "Admin team"],
  ["/admin/audit-log", "Audit log"],
] as const;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ email: string; name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setMe(d.admin))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link className="brand" href="/admin">
          <span className="mark">
            <PawMark />
          </span>
          <span>
            <strong>VSN Admin</strong>
            <small>Waitlist phase console</small>
          </span>
        </Link>
        <div className="tag">Launch waitlist</div>
        <nav>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={`adm-link${pathname === href ? " on" : ""}`}>
              {label}
            </Link>
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
