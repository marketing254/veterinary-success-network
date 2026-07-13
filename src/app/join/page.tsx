import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Countdown from "@/components/Countdown";
import ReservationForm from "@/components/forms/ReservationForm";

export const metadata: Metadata = {
  title: "Reserve your founding spot | Veterinary Success Network",
  description:
    "Reserve one of the first 100 founding memberships: $49/mo locked for life. No payment today; we email your secure checkout link when founding doors open. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Reserve your founding spot | Veterinary Success Network",
    description:
      "The first 100 founding memberships lock $49/mo for life. No payment today; your secure checkout link arrives when founding doors open.",
    url: "/join",
  },
};

export default function JoinPage() {
  return (
    <>
      <Nav cta={null} />

      <header className="hero" style={{ padding: "56px 0 0" }}>
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> Founding cohort forming: first 100 lock $49/mo for life
          </span>
          <h1 style={{ fontSize: 46 }}>
            Reserve your <em>founding</em> spot.
          </h1>
          <p className="sub">
            No payment today. When founding doors open we email your secure checkout link; spots and
            the $49 price lock are assigned in the order reservations arrive.
          </p>
          <Countdown compact />
        </div>
      </header>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="applygrid">
            <div className="formcard">
              <Suspense fallback={null}>
                <ReservationForm />
              </Suspense>
            </div>

            <aside className="aside-card">
              <span className="atag">Founding · first 100</span>
              <h3>What you&apos;re reserving</h3>
              <ul>
                <li>Expert Hotline: a written action plan + 3–4 vetted experts per question</li>
                <li>Member-only partner deals (Ekwa: $250 off × 2 months)</li>
                <li>Resource library: new kits weekly</li>
                <li>Live AMAs &amp; CE every month</li>
                <li>Community of owners, experts &amp; partners</li>
              </ul>
              <div className="fine">
                <b>$49/mo locked for life</b> (or $490/yr, 2 months free) for the first 100 members.
                After that, pricing steps to $99, then $199. Money-back guarantee · cancel anytime.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
