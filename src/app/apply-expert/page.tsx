import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ExpertApplicationForm from "@/components/forms/ExpertApplicationForm";

export const metadata: Metadata = {
  title: "Apply to the founding expert bench | Veterinary Success Network",
  description:
    "Apply to join the VSN founding expert bench. Share one recording and we build your full content kit, feature you to veterinary practice owners, and send warm leads to your calendar. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/apply-expert" },
  openGraph: {
    title: "Apply to the founding expert bench | Veterinary Success Network",
    description:
      "Share one recording and we build your full content kit, feature you to veterinary practice owners, and send warm leads to your calendar.",
    url: "/apply-expert",
  },
};

export default function ApplyExpertPage() {
  return (
    <>
      <Nav active="experts" cta={null} />

      <header className="hero" style={{ padding: "56px 0 0" }}>
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> For experts · founding bench forming
          </span>
          <h1 style={{ fontSize: 46 }}>
            Apply to the <em>founding</em> expert bench.
          </h1>
          <p className="sub">
            Tell us about your work and the topics you&apos;d teach. Every application is reviewed by
            hand by the Veterinary Business Institute team. Expect a reply within a few business
            days.
          </p>
        </div>
      </header>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="applygrid">
            <div className="formcard">
              <ExpertApplicationForm />
            </div>

            <aside className="aside-card">
              <span className="atag">Founding bench · months 1–6 free</span>
              <h3>How it works</h3>
              <ul>
                <li>You share one recording of you teaching (up to an hour)</li>
                <li>We build your full kit: video, guide, checklist, worksheet, deck, poster</li>
                <li>You approve everything before it goes live</li>
                <li>Members book straight onto your calendar; the hotline refers by fit</li>
                <li>Sell your own courses, keep 70%</li>
              </ul>
              <div className="fine">
                <b>What it costs:</b> $0 for months 1–6, then $49/mo (months 7–12), then $199/mo
                standard, with the same Featured Expert benefits at every phase. Annual pre-pay
                unlocks at month 7.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
