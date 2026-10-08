import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Countdown from "@/components/Countdown";
import ReservationForm from "@/components/forms/ReservationForm";
import ClaimSpot from "@/components/forms/ClaimSpot";
import { MEMBER_LAUNCH_ENABLED } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Reserve your founding spot | Veterinary Success Network",
  description:
    "Reserve one of the first 100 founding memberships: $29/mo locked for life. No payment today; we email your secure checkout link when founding doors open. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Reserve your founding spot | Veterinary Success Network",
    description:
      "The first 100 founding memberships lock $29/mo for life. No payment today; your secure checkout link arrives when founding doors open.",
    url: "/join",
  },
};

export default function JoinPage({ searchParams }: { searchParams?: { wl?: string } }) {
  // After launch, the launch email links here with ?wl=<reservation id>: show the one-click checkout above the form.
  const wl = MEMBER_LAUNCH_ENABLED && searchParams?.wl && /^[0-9a-f-]{36}$/i.test(searchParams.wl) ? searchParams.wl : null;
  return (
    <>
      <Nav cta={null} />

      <header className="hero" style={{ padding: "56px 0 0" }}>
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> Founding cohort forming: first 100 lock $29/mo for life
          </span>
          <h1 style={{ fontSize: 46 }}>
            Reserve your <em>founding</em> spot.
          </h1>
          <p className="sub">
            No payment today. When founding doors open we email your secure checkout link; spots and
            the $29 price lock are assigned in the order reservations arrive.
          </p>
          <Countdown compact />
        </div>
      </header>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="applygrid">
            <div>
              {wl && <ClaimSpot reservationId={wl} />}
              <div className="formcard">
                <Suspense fallback={null}>
                  <ReservationForm />
                </Suspense>
              </div>
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
                <b>$29/mo locked for life</b> (or $290/yr, 2 months free) for the first 100 members.
                After that, the standard rate is $99/mo. 30-day money-back guarantee · cancel anytime.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
