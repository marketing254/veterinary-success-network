import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PoweredBy from "@/components/PoweredBy";
import { PawGlyph } from "@/components/Brand";
import { Bird, Dog, Rabbit } from "@/components/Animals";

export const metadata: Metadata = {
  title: "Become a Partner | Veterinary Success Network",
  description:
    "Get in front of veterinary practice owners who are actively investing in their practice, through a trusted shortlist, not a cold ad. Pay nothing for 6 months. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/partners" },
  openGraph: {
    title: "Become a Partner | Veterinary Success Network",
    description:
      "Get in front of veterinary practice owners who are actively investing in their practice, through a trusted shortlist, not a cold ad. Pay nothing for 6 months.",
    url: "/partners",
  },
};

const GETS: [React.ReactNode, string, string][] = [
  [
    <g key="p"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></g>,
    "Profile & placement",
    "A dedicated profile and searchable spot in your category.",
  ],
  [
    <g key="p"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></g>,
    "Lead flow",
    "Member inquiries with a dashboard and conversion data.",
  ],
  [
    <g key="p"><path d="M20 7l-9 9-4-4" /><circle cx="12" cy="12" r="9" /></g>,
    "Verified Partner badge",
    "Credibility from a vetted shortlist, not an open marketplace.",
  ],
  [
    <path key="p" d="M3 5a2 2 0 0 1 2-2h3l2 4-2 1a12 12 0 0 0 6 6l1-2 4 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" />,
    "Podcast & events",
    "Guest and speaking slots across the VBI network.",
  ],
  [
    <path key="p" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    "Co-marketing",
    "Co-branded case studies and newsletter mentions.",
  ],
  [
    <g key="p"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></g>,
    "A buying audience",
    "Owners reached across the Veterinary Business Institute ecosystem.",
  ],
];

const CATEGORIES = [
  "Veterinary supplies & distributors",
  "Equipment & clinic build-outs",
  "Practice-management software",
  "Billing & credentialing",
  "HR, payroll & compliance",
  "Client financing",
  "Phones, call-tracking & AI",
  "Coaching & consulting",
  "Continuing education",
  "Accounting, tax & CFO",
];

export default function PartnersPage() {
  return (
    <>
      <Nav active="partners" cta={{ href: "/apply-partner", label: "Apply as a partner" }} />

      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> For partners · vendor network
          </span>
          <h1>
            Get in front of veterinary&apos;s most <em>engaged</em> buyers.
          </h1>
          <p className="sub">
            Reach practice owners actively investing in their practice, through a trusted shortlist,
            not a cold ad. Pay nothing for 6 months. The channel pays for itself as deals close.
          </p>
          <div className="cta-row">
            <Link className="btn solid" href="/apply-partner">Claim your founding spot →</Link>
            <a className="btn glass" href="#how">See how it works</a>
          </div>
          <div className="trustline">
            <span>✓ <b>Any company serving veterinary practices can apply</b></span>
            <span>✓ <b>Founding partners get priority placement</b></span>
          </div>
          <div className="fstrip">
            <Bird className="f1" />
            <Dog className="f2" />
            <Rabbit className="f3" />
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="offer reveal">
          <div className="em">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l2.5 5.2 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8z" />
            </svg>
          </div>
          <div>
            <div className="tag">Why partners join</div>
            <div className="k">Members come to you pre-qualified.</div>
            <div className="dd">
              Through a recommendation they trust (from the hotline, the directory and the library),
              not an ad they scrolled past.
            </div>
          </div>
        </div>
      </div>

      {/* WHERE MEMBERS COME FROM */}
      <section className="sec">
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Where members come from</div>
            <div className="h2">One connected audience of practice owners.</div>
            <p className="lead">
              VSN members are recruited from the Veterinary Business Institute audience (its podcast,
              events and webinars), and they join specifically to invest in their practice.
            </p>
          </div>
          <div style={{ marginTop: 24 }}>
            <PoweredBy cap="" community />
          </div>
          <div className="disclaimer reveal" style={{ marginTop: 22 }}>
            100% intent-driven traffic: every lead you get is a member who asked about your
            category. We don&apos;t sell ad impressions.
          </div>
        </div>
      </section>

      {/* FOUNDING PARTNERS */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Our founding partners</div>
            <div className="h2">The first names in the directory.</div>
          </div>
          <div className="pplgrid">
            <div className="ppl reveal">
              <span className="av">EK</span>
              <div>
                <b>Ekwa Marketing</b>
                <div className="role">Marketing · Client acquisition</div>
                <p>
                  20+ years of healthcare-practice marketing: SEO, websites and patient acquisition.
                  Founding member offer: <b>$250 off each of the first 2 months.</b>
                </p>
              </div>
            </div>
            <div className="ppl reveal">
              <span className="av open">+</span>
              <div>
                <b>Your company here</b>
                <div className="role">Founding cohort · Priority placement</div>
                <p>
                  Founding partners get priority placement in the directory launch and the founding
                  fee waiver. We&apos;re building a hub of the experts and companies that serve veterinary
                  practices; claim your founding spot early.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec" id="how" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">How it works</div>
            <div className="h2">A recommendation members trust</div>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="n">1</div>
              <h3>You apply</h3>
              <p>Tell us your category and the exclusive deal you&apos;ll offer members.</p>
            </div>
            <div className="step reveal">
              <div className="n">2</div>
              <h3>We vet and list you</h3>
              <p>A profile, a Verified Partner badge, and searchable placement in your category.</p>
            </div>
            <div className="step reveal">
              <div className="n">3</div>
              <h3>Leads route to you</h3>
              <p>Member inquiries arrive with a dashboard and conversion data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">What you get</div>
            <div className="h2">A buying audience, on a trusted shortlist</div>
          </div>
          <div className="feat">
            {GETS.map(([icon, title, text]) => (
              <div className="fcard reveal" key={title}>
                <div className="ico">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {icon}
                  </svg>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU OFFER */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">The heart of the deal</div>
            <div className="h2">What you offer members</div>
            <p className="lead">
              Every partner gives VSN members an exclusive discount or benefit, better than your
              standard pricing.
            </p>
          </div>
          <div className="feat">
            <div className="fcard reveal">
              <div className="ico">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3 8-8" />
                  <path d="M21 12a9 9 0 1 1-6-8.5" />
                </svg>
              </div>
              <h3>An exclusive member discount</h3>
              <p>A discount or benefit at least as good as any offer you make to comparable customers.</p>
            </div>
            <div className="fcard reveal">
              <div className="ico">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 8h18M8 2v4M16 2v4" />
                </svg>
              </div>
              <h3>Stay reachable</h3>
              <p>A booking link members can use, with a response within one business day.</p>
            </div>
            <div className="fcard reveal">
              <div className="ico">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Honor the deal</h3>
              <p>Keep your member benefit live; any change comes with 30 days notice.</p>
            </div>
          </div>
          <div className="offer reveal">
            <div className="em">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="8" width="18" height="4" rx="1" />
                <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M12 8v13M12 8s-4.2 0-5.4-2.1C5.8 4.4 7 3 8.5 3 11 3 12 8 12 8zm0 0s4.2 0 5.4-2.1C18.2 4.4 17 3 15.5 3 13 3 12 8 12 8z" />
              </svg>
            </div>
            <div>
              <div className="tag">Live example: our founding partner&apos;s offer</div>
              <div className="k">Ekwa Marketing: $250 off each of the first 2 months</div>
              <div className="dd">
                The bar for a founding-partner deal: real, exclusive, and better than standard
                pricing. Members often cover their dues with one deal.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="kicker">What it costs</div>
            <div className="h2">Build your pipeline first, pay later</div>
            <p className="lead">Same Featured Partner benefits at every phase. Annual pre-pay unlocks at month 7.</p>
          </div>
          <div className="prices">
            <div className="pcard feat reveal">
              <div className="tag">Months 1–6</div>
              <div className="cap">Founding-cohort waiver</div>
              <div className="amt">$0</div>
              <div className="d">Build your pipeline first, pay later.</div>
              <Link className="btn solid" href="/apply-partner" style={{ width: "100%", justifyContent: "center" }}>
                Apply for founding
              </Link>
            </div>
            <div className="pcard reveal">
              <div className="cap">Months 7–12</div>
              <div className="amt">$49<span>/mo</span></div>
              <div className="d">Founding locked rate.</div>
              <Link className="btn glass" href="/apply-partner" style={{ width: "100%", justifyContent: "center" }}>
                Apply
              </Link>
            </div>
            <div className="pcard reveal">
              <div className="cap">Month 13+</div>
              <div className="amt">$199<span>/mo</span></div>
              <div className="d">Featured Partner rate · or $1,990/yr (2 months free).</div>
              <Link className="btn glass" href="/apply-partner" style={{ width: "100%", justifyContent: "center" }}>
                Apply
              </Link>
            </div>
          </div>
          <div className="guarantee reveal">
            <PawGlyph className="ipaw" />
            <b>Founding partners</b> get priority placement in the directory launch · <b>$50 credit</b>{" "}
            for every paying member you refer.
          </div>
        </div>
      </section>

      {/* WHO WE'RE RECRUITING */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Who we&apos;re recruiting</div>
            <div className="h2">Every category that serves a veterinary practice.</div>
          </div>
          <div className="catgrid reveal">
            {CATEGORIES.map((c) => (
              <span className="catpill" key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FIT */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Fit check</div>
            <div className="h2">Is this a fit?</div>
          </div>
          <div className="fit">
            <div className="fitcol yes reveal">
              <h3>For you if</h3>
              <ul>
                <li>You sell to veterinary practices (software, supplies, equipment, services)</li>
                <li>You can offer members a genuine deal</li>
                <li>You can respond to leads within a business day</li>
              </ul>
            </div>
            <div className="fitcol no reveal">
              <h3>Not for you if</h3>
              <ul>
                <li>You can&apos;t beat your standard pricing for members</li>
                <li>You want a passive ad you never follow up on</li>
              </ul>
            </div>
          </div>
          <p className="lead reveal" style={{ marginTop: 26 }}>
            Partners with teaching chops can also contribute content, same quality bar as experts.{" "}
            <Link href="/experts" style={{ color: "var(--deep)", fontWeight: 700 }}>
              See our experts →
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta reveal" id="apply">
            <h2>Become a founding partner.</h2>
            <p>
              Apply now to lock the founding ramp ($0 for 6 months) and priority placement in the
              directory launch.
            </p>
            <Link
              className="btn glass"
              href="/apply-partner"
              style={{ fontSize: 16, padding: "15px 32px", background: "#fff", color: "var(--dark)" }}
            >
              Claim your founding partner spot →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
