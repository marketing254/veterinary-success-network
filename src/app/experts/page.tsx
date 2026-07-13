import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PoweredBy from "@/components/PoweredBy";
import { PawGlyph } from "@/components/Brand";
import { Cat, Dog, Bird } from "@/components/Animals";

export const metadata: Metadata = {
  title: "Become an Expert | Veterinary Success Network",
  description:
    "Share one recording. We build your full content kit, put it in front of veterinary practice owners, and send warm leads to your calendar. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/experts" },
  openGraph: {
    title: "Become an Expert | Veterinary Success Network",
    description:
      "Share one recording. We build your full content kit, put it in front of veterinary practice owners, and send warm leads to your calendar.",
    url: "/experts",
  },
};

const GETS: [React.ReactNode, string, string][] = [
  [
    <g key="p"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></g>,
    "A done-for-you library",
    "Produced for you, in your branding, from one recording.",
  ],
  [
    <g key="p"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></g>,
    "Your featured profile",
    "Your resources, bio and brand in the member portal.",
  ],
  [
    <path key="p" d="M3 5a2 2 0 0 1 2-2h3l2 4-2 1a12 12 0 0 0 6 6l1-2 4 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" />,
    "Warm leads",
    "Interested members book straight onto your calendar.",
  ],
  [
    <g key="p"><path d="M20 7l-9 9-4-4" /><circle cx="12" cy="12" r="9" /></g>,
    "Hotline referrals",
    "We point members to you when their problem fits. Never pay-to-play.",
  ],
  [
    <path key="p" d="M12 3l2.5 5 5.5.8-4 4 1 5.5L12 20l-5 2.8 1-5.5-4-4 5.5-.8z" />,
    "Sell your own courses",
    "List paid courses to members and keep 70% of the revenue.",
  ],
  [
    <path key="p" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    "Co-marketing",
    "Features across the Veterinary Business Institute podcast, events and webinars.",
  ],
];

export default function ExpertsPage() {
  return (
    <>
      <Nav active="experts" cta={{ href: "/apply-expert", label: "Apply as an expert" }} />

      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> For experts · founding bench forming
          </span>
          <h1>
            Turn your expertise into a <em>done-for-you</em> library and warm leads.
          </h1>
          <p className="sub">
            Share one recording. We build the full content kit, put it in front of veterinary
            practice owners, and send interested members straight to your calendar.
          </p>
          <div className="cta-row">
            <Link className="btn solid" href="/apply-expert">Apply to be an expert →</Link>
            <a className="btn glass" href="#how">See how it works</a>
          </div>
          <div className="trustline">
            <span>✓ <b>We do the production</b></span>
            <span>✓ <b>We bring the audience</b></span>
            <span>✓ <b>Keep 70% of course sales</b></span>
          </div>
          <div className="fstrip">
            <Cat className="f1" />
            <Dog className="f2" />
            <Bird className="f3" />
          </div>
          <PoweredBy cap="Curated by the Veterinary Business Institute team, not an algorithm" />
        </div>
      </header>

      {/* FOUNDING BENCH */}
      <section className="sec" style={{ paddingTop: 30 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Our experts</div>
            <div className="h2">The founding bench is being hand-picked now.</div>
            <p className="lead">
              The first 20 experts are invited from the Veterinary Business Institute audience: its
              podcast guests, speakers and community. New experts join by application.
            </p>
          </div>
          <div className="pplgrid">
            <div className="ppl reveal">
              <span className="av open">+</span>
              <div>
                <b>Founding Expert: announcing soon</b>
                <div className="role">Practice growth · Team · Finance</div>
                <p>
                  Hand-picked coaches and consultants with real veterinary operating experience.
                  Announced as each founding seat is confirmed.
                </p>
              </div>
            </div>
            <div className="ppl reveal">
              <span className="av open">+</span>
              <div>
                <b>Your name here?</b>
                <div className="role">By application · Curated for fit</div>
                <p>
                  If you coach, consult or teach in the veterinary profession, apply below; founding
                  seats carry the best terms VSN will ever offer.
                </p>
              </div>
            </div>
          </div>
          <div className="disclaimer reveal" style={{ marginTop: 22 }}>
            We publish real names only once experts are confirmed. No borrowed logos, no inflated
            benches.
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="offer reveal">
          <div className="em">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l2.5 5.2 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8z" />
            </svg>
          </div>
          <div>
            <div className="tag">Why experts join</div>
            <div className="k">Other networks ask you to make content and chase an audience. We don&apos;t.</div>
            <div className="dd">
              You share one recording. We do the production, we bring the audience, and interested
              members book straight onto your calendar.
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="sec" id="how">
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">How it works</div>
            <div className="h2">One recording. We do the rest.</div>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="n">1</div>
              <h3>You share</h3>
              <p>One recording of you teaching your topic (up to an hour), plus a headshot, bio and booking link.</p>
            </div>
            <div className="step reveal">
              <div className="n">2</div>
              <h3>We build</h3>
              <p>
                Your full kit (video, action guide, checklist, worksheet, slide deck, poster), and
                you approve everything before it goes live.
              </p>
            </div>
            <div className="step reveal">
              <div className="n">3</div>
              <h3>You get booked</h3>
              <p>
                Every resource carries a book-a-meeting button, and the hotline refers members to you
                when their problem fits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">What you get</div>
            <div className="h2">Exposure, leads, and a library built for you</div>
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

      {/* PRICING */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="kicker">What it costs</div>
            <div className="h2">Build first. Pay once it&apos;s working.</div>
            <p className="lead">Same Featured Expert benefits at every phase. Annual pre-pay unlocks at month 7.</p>
          </div>
          <div className="prices">
            <div className="pcard feat reveal">
              <div className="tag">Months 1–6</div>
              <div className="cap">Founding-cohort waiver</div>
              <div className="amt">$0</div>
              <div className="d">Get set up, build your library, get featured, all before you pay anything.</div>
              <Link className="btn solid" href="/apply-expert" style={{ width: "100%", justifyContent: "center" }}>
                Apply to the bench
              </Link>
            </div>
            <div className="pcard reveal">
              <div className="cap">Months 7–12</div>
              <div className="amt">$49<span>/mo</span></div>
              <div className="d">Locked launch rate.</div>
              <Link className="btn glass" href="/apply-expert" style={{ width: "100%", justifyContent: "center" }}>
                Apply
              </Link>
            </div>
            <div className="pcard reveal">
              <div className="cap">Month 13+</div>
              <div className="amt">$199<span>/mo</span></div>
              <div className="d">Standard rate · or $1,990/yr (2 months free).</div>
              <Link className="btn glass" href="/apply-expert" style={{ width: "100%", justifyContent: "center" }}>
                Apply
              </Link>
            </div>
          </div>
          <div className="guarantee reveal">
            <PawGlyph className="ipaw" />
            <b>Course revenue split: keep 70%.</b> Sell your own paid courses through VSN; the
            network keeps 30%.
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
                <li>You coach, consult or teach in the veterinary profession</li>
                <li>You have content, or can record it</li>
                <li>You want exposure and warm leads without doing the production</li>
              </ul>
            </div>
            <div className="fitcol no reveal">
              <h3>Not for you if</h3>
              <ul>
                <li>You want to hard-sell with no real value</li>
                <li>You can&apos;t be reachable when we send you a member who fits</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* APPLY CTA */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta reveal" id="apply">
            <h2>Join our founding expert bench.</h2>
            <p>
              Tell us about your work and the topics you&apos;d teach. There&apos;s no platform to wrestle
              with: you share your material, we build everything, and you approve it before it goes
              live.
            </p>
            <Link
              className="btn glass"
              href="/apply-expert"
              style={{ fontSize: 16, padding: "15px 32px", background: "#fff", color: "var(--dark)" }}
            >
              Apply to be an expert →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
