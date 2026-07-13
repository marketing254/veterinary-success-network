import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PartnerApplicationForm from "@/components/forms/PartnerApplicationForm";

export const metadata: Metadata = {
  title: "Claim your founding partner spot | Veterinary Success Network",
  description:
    "Apply to become a VSN founding partner. Priority placement in the directory launch, and pay nothing for 6 months. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/apply-partner" },
  openGraph: {
    title: "Claim your founding partner spot | Veterinary Success Network",
    description:
      "Priority placement in the directory launch, and pay nothing for 6 months. Every partner gives members an exclusive deal.",
    url: "/apply-partner",
  },
};

export default function ApplyPartnerPage() {
  return (
    <>
      <Nav active="partners" cta={null} />

      <header className="hero" style={{ padding: "56px 0 0" }}>
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> For partners · founding cohort forming
          </span>
          <h1 style={{ fontSize: 46 }}>
            Claim your <em>founding</em> partner spot.
          </h1>
          <p className="sub">
            Tell us your category and the exclusive deal you&apos;ll offer members. We vet every partner:
            the directory is a trusted shortlist, not an open marketplace.
          </p>
        </div>
      </header>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="applygrid">
            <div className="formcard">
              <PartnerApplicationForm />
            </div>

            <aside className="aside-card">
              <span className="atag">Founding cohort</span>
              <h3>What founding partners get</h3>
              <ul>
                <li>Priority placement in the directory launch as a founding partner</li>
                <li>Profile, Verified Partner badge &amp; searchable placement</li>
                <li>Member inquiries with a dashboard and conversion data</li>
                <li>Podcast, webinar &amp; event features across the VBI network</li>
                <li>$50 credit for every paying member you refer</li>
              </ul>
              <div className="fine">
                <b>What it costs:</b> $0 for months 1–6, then $49/mo (months 7–12), then $199/mo
                Featured Partner, with the same benefits at every phase. Annual pre-pay unlocks at
                month 7.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
