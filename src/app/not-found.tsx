import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import { Dog } from "@/components/Animals";

export const metadata: Metadata = {
  title: "Page not found | Veterinary Success Network",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <Nav cta={{ href: "/join", label: "Become a member" }} />

      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> 404
          </span>
          <h1>This page wandered off.</h1>
          <p className="sub">The address doesn&apos;t exist (or moved). Everything worth seeing is one click away.</p>
          <div className="cta-row">
            <Link className="btn solid" href="/">Back to the home page</Link>
            <Link className="btn glass" href="/join">Reserve a founding spot</Link>
          </div>
          <div className="fstrip">
            <Dog className="f2" />
          </div>
        </div>
      </header>

      <footer>
        <div className="wrap">
          <div className="fb" style={{ borderTop: "none", justifyContent: "center" }}>
            <span>© 2026 Veterinary Success Network · Powered by Veterinary Business Institute</span>
          </div>
        </div>
      </footer>
    </>
  );
}
