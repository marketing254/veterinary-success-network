"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PORTALS = [
  { href: "/join", title: "Members", sub: "Practice owners · portal opens at launch", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg> },
  { href: "/expert/login", title: "Experts", sub: "Coaches, consultants & educators", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-4 9 4-9 4-9-4z" /><path d="M7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5M21 9v6" /></svg> },
  { href: "/partner/login", title: "Partners", sub: "Vendors & service providers", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10h18M5 10v10h14V10M3 10l2-5h14l2 5M9 20v-5h6v5" /></svg> },
];

/** Navbar "Sign in" button with the choose-your-portal menu. */
export default function SignInMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <div className={`signin${open ? " open" : ""}`} ref={ref}>
      <button type="button" className="btn solid signin-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Sign in
        <svg className="chev" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1.5l5 5 5-5" /></svg>
      </button>
      {open && (
        <div className="signin-menu" role="menu">
          <div className="signin-head">Choose your portal</div>
          {PORTALS.map((p) => (
            <Link key={p.href} href={p.href} role="menuitem" className="signin-item" onClick={() => setOpen(false)}>
              <span className="ic">{p.icon}</span>
              <span>
                <b>{p.title}</b>
                <small>{p.sub}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
