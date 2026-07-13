import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PoweredBy from "@/components/PoweredBy";
import Countdown from "@/components/Countdown";
import { PawGlyph } from "@/components/Brand";
import Stage from "@/components/home/Stage";
import HotlineDemo from "@/components/home/HotlineDemo";
import RoiCalc from "@/components/home/RoiCalc";
import PricingCards from "@/components/home/PricingCards";
import Faq from "@/components/home/Faq";

export const metadata: Metadata = {
  title: "Veterinary Success Network | Every practice problem gets a written action plan",
  description:
    "The only veterinary network where every practice problem gets a written action plan in 2–3 business days, plus a growing resource library, member-only partner deals, live AMAs & CE, and a community of owners. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Veterinary Success Network | Every practice problem gets a written action plan",
    description:
      "Expert Hotline, growing resource library, member-only partner deals, live AMAs & CE, and a community of owners. Powered by Veterinary Business Institute.",
    url: "/",
  },
};

const FEATURES: [React.ReactNode, string, string][] = [
  [
    <path key="p" d="M3 5a2 2 0 0 1 2-2h3l2 4-2 1a12 12 0 0 0 6 6l1-2 4 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" />,
    "Expert Hotline",
    "A written action plan plus 3–4 expert contacts, in 2–3 business days.",
  ],
  [
    <g key="p"><circle cx="12" cy="12" r="9" /><path d="M20 7l-9 9-4-4" /></g>,
    "Exclusive partner savings",
    "Vetted vendors with member-only deals, starting with $250 off × 2 months at Ekwa.",
  ],
  [
    <g key="p"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></g>,
    "Growing resource library",
    "Done-for-you kits (video, action guide, checklist, worksheet), new every week.",
  ],
  [
    <path key="p" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    "Community of owners",
    "A searchable network of experts, partners and peers who get it.",
  ],
  [
    <g key="p"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></g>,
    "Live AMAs & CE",
    "A recurring monthly live session: ask questions, learn, earn CE where eligible.",
  ],
  [
    <g key="p"><path d="M9 11l3 3 8-8" /><path d="M21 12a9 9 0 1 1-6-8.5" /></g>,
    "Templates & worksheets",
    "SOPs, checklists and scripts your team can use the same day.",
  ],
];

const KITS: [string, string, string, string][] = [
  ["linear-gradient(135deg,#3BAB00,#77CC00)", "47 min", "The 9 KPIs that drive your practice", "Kit · video + worksheet + checklist"],
  ["linear-gradient(135deg,#2f6f12,#55B900)", "52 min", "Raising fees without losing clients", "Kit · video + fee-audit worksheet"],
  ["linear-gradient(135deg,#55B900,#9bdd62)", "44 min", "Ending the no-show problem", "Kit · video + scripts + poster"],
  ["linear-gradient(135deg,#1c3310,#3BAB00)", "58 min", "Hiring & keeping great associates", "Kit · video + interview guide"],
  ["linear-gradient(135deg,#77CC00,#3BAB00)", "39 min", "Google reviews & your reputation", "Kit · video + response templates"],
  ["linear-gradient(135deg,#4a8f1c,#77CC00)", "51 min", "Getting inventory costs under control", "Kit · video + tracking worksheet"],
];

export default function Home() {
  return (
    <>
      <Nav variant="home" cta={{ href: "/#pricing", label: "Become a member" }} />

      <header className="hero">
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> Founding cohort forming: first 100 lock $49/mo for life
          </span>
          <h1>
            The only veterinary network where every practice problem gets a <em>written action plan</em>.
          </h1>
          <p className="sub">
            Leave your toughest question on the Expert Hotline. Within 2–3 business days you get a
            written plan and 3–4 vetted experts, plus a growing library, member-only partner deals,
            live AMAs &amp; CE, and a community of owners.
          </p>
          <Countdown />
          <div className="cta-row">
            <Link className="btn solid" href="/join?plan=founding">Reserve a founding spot →</Link>
            <a className="btn glass" href="#hotline">See how the hotline works</a>
          </div>
          <div className="trustline">
            <span>✓ <b>Cancel anytime</b></span>
            <span>✓ <b>Money-back guarantee</b></span>
            <span>✓ <b>Real, considered replies</b></span>
          </div>

          <Stage />
          <PoweredBy />
        </div>
      </header>

      {/* HOTLINE */}
      <section className="sec" id="hotline">
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">The feature no one else has</div>
            <div className="h2">Stuck? Put a person on it.</div>
            <p className="lead">
              Other networks hand you a search bar and a forum. VSN hands you a written plan and the
              right people, matched to your exact problem.
            </p>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="n">1</div>
              <h3>You describe the problem</h3>
              <p>Call the members&apos; toll-free line and leave a voicemail. Plain English, any category.</p>
            </div>
            <div className="step reveal">
              <div className="n">2</div>
              <h3>We work it</h3>
              <p>AI-assisted and reviewed by our team, matched against the library and the expert bench.</p>
            </div>
            <div className="step reveal">
              <div className="n">3</div>
              <h3>You get a written plan</h3>
              <p>Within 2–3 business days, by text and email: a recommended path plus 3–4 vetted experts.</p>
            </div>
          </div>
          <div className="hotwrap dark reveal" style={{ marginTop: 26 }}>
            <HotlineDemo />
          </div>
        </div>
      </section>

      {/* CREDIBILITY */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Why trust us</div>
            <div className="h2">The team behind the network</div>
            <div className="disclaimer">
              VSN is pre-launch. Member reviews are being collected and will be added here as the
              network grows. We don&apos;t publish invented testimonials.
            </div>
          </div>
          <div className="revs">
            <div className="rcard reveal">
              <div className="src">
                <span className="av">VBI</span>
                <span>
                  <b>Veterinary Business Institute</b>
                  <small>The parent brand</small>
                </span>
              </div>
              <p>
                VSN is built by the team behind Veterinary Business Institute, serving veterinary
                practice owners through its podcast, events and webinars. The network carries VBI&apos;s
                standards, not an algorithm&apos;s.
              </p>
            </div>
            <div className="rcard reveal">
              <div className="src">
                <span className="av">EK</span>
                <span>
                  <b>Ekwa Marketing</b>
                  <small>Founding partner</small>
                </span>
              </div>
              <p>
                Our founding marketing partner has spent 20+ years helping healthcare practices grow,
                and gives VSN members an exclusive deal from day one.
              </p>
            </div>
            <div className="rcard reveal">
              <div className="src">
                <span className="av">✓</span>
                <span>
                  <b>Hand-picked experts</b>
                  <small>Curated, never pay-to-play</small>
                </span>
              </div>
              <p>
                Every expert on the bench is vetted for real operating experience with veterinary
                practices. Hotline routing is by fit: experts can&apos;t buy placement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS VSN */}
      <section className="sec" id="what" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">What is VSN?</div>
            <div className="h2">The membership is the product.</div>
            <p className="lead">No funnels, no &quot;next step&quot; that costs four figures. Just the value you joined for.</p>
          </div>
          <div className="feat">
            {FEATURES.map(([icon, title, text]) => (
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

      {/* PORTAL PREVIEW */}
      <section className="sec" id="library" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">A look inside the member library</div>
            <div className="h2">What you actually see after you sign in</div>
          </div>
          <div className="portal reveal">
            <div className="bar">
              <span className="dots"><i></i><i></i><i></i></span>
              <span className="url">app.veterinarysuccessnetwork.com / library</span>
            </div>
            <div className="body">
              <div className="p-side">
                <div className="me">
                  <span className="av">DR</span>
                  <span>
                    <b>Your Practice</b>
                    <small>Founding · #001</small>
                  </span>
                </div>
                {["Library", "Hotline", "Live", "Network", "Partners", "Account"].map((item, i) => (
                  <a key={item} className={i === 0 ? "on" : undefined} href="#library">
                    {item}
                  </a>
                ))}
                <div className="ledger">
                  <div className="t">Partner savings YTD</div>
                  <div className="v">$250</div>
                  <small>Ekwa deal · month 1 of 2</small>
                </div>
              </div>
              <div className="p-main">
                <div className="ph">
                  <h4>Resource kits</h4>
                  <span className="prog">6 of 42 resources</span>
                </div>
                <div className="cats">
                  {["All", "Practice Management", "Team & Hiring", "Marketing & Growth", "Finance & Fees"].map((c, i) => (
                    <span key={c} className={`cat${i === 0 ? " on" : ""}`}>{c}</span>
                  ))}
                </div>
                <div className="rgrid">
                  {KITS.map(([bg, dur, title, kind]) => (
                    <div className="rc" key={title}>
                      <div className="th" style={{ background: bg }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                          <polygon points="10 8 16 12 10 16 10 8" />
                        </svg>
                        <span className="dur">{dur}</span>
                      </div>
                      <div className="tt">{title}</div>
                      <div className="kk">{kind}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="cap2">
              Illustrative preview. The member portal opens with launch, built from our founding
              experts&apos; kits.
            </div>
          </div>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Do the math</div>
            <div className="h2">It can pay for itself with one partner deal.</div>
            <p className="lead">
              Our founding partner deal alone ($250 off × 2 months at Ekwa) is worth more than 10
              months of founding membership.
            </p>
          </div>
          <RoiCalc />
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" id="pricing" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <PricingCards />
          <div className="spots reveal">
            <div className="lab">First 100 only · 100 of 100 left</div>
            <div className="bar"><i style={{ width: "100%" }}></i></div>
            <small>Founding pricing ends when the 100th member joins.</small>
          </div>
          <div className="guarantee reveal">
            <PawGlyph className="ipaw" />
            <b>Money-back guarantee</b> · cancel anytime · annual prepay = 2 months free.
          </div>
        </div>
      </section>

      {/* FIT CHECK */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Honest fit check</div>
            <div className="h2">Built for owners running a real business.</div>
          </div>
          <div className="fit">
            <div className="fitcol yes reveal">
              <h3>This is for you if</h3>
              <ul>
                <li>You own or run a veterinary practice and make the decisions</li>
                <li>You want fast, specific answers, not forum scrolling</li>
                <li>You&apos;re tired of guessing on vendors, fees and systems</li>
                <li>You value experts and peers who&apos;ve already solved your problem</li>
              </ul>
            </div>
            <div className="fitcol no reveal">
              <h3>This isn&apos;t for you if</h3>
              <ul>
                <li>You&apos;re after free generic content</li>
                <li>You want $20k one-on-one coaching</li>
                <li>You won&apos;t use the hotline or the deals</li>
                <li>You&apos;re not a decision-maker at a practice</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FREE KIT */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="kit reveal">
            <div>
              <span className="pill2">100% free · no membership needed</span>
              <h3>Not ready to join? Take a kit for a test drive.</h3>
              <p>
                Get our first free resource kit when it drops and see the production quality before
                you spend a dollar.
              </p>
              <ul>
                <li>Training video from a founding expert</li>
                <li>Action guide + step-by-step checklist</li>
                <li>Worksheet your team can use the same day</li>
              </ul>
              <Link className="btn solid" href="/free-kit" style={{ marginTop: 20 }}>
                Send me the free kit →
              </Link>
              <small style={{ display: "block", marginTop: 12, color: "var(--muted)", fontSize: 12.5 }}>
                No spam, no membership pitch. Just the kit when it&apos;s ready.
              </small>
            </div>
            <div className="visual">
              <div className="doc">
                <div className="t">
                  <PawGlyph className="ipaw" />
                  VSN Resource Kit
                </div>
                <div className="l"></div>
                <div className="l"></div>
                <div className="l s"></div>
                <div className="l"></div>
                <div className="l s"></div>
              </div>
              <small>Every kit: video · guide · checklist · takeaways · worksheet · slides · poster</small>
            </div>
          </div>
        </div>
      </section>

      {/* THREE WAYS IN */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Founded by Veterinary Business Institute</div>
            <div className="h2">One network. Three ways in.</div>
            <p className="lead">
              Connecting veterinary practice owners with the experts and companies that help them
              grow, curated by people, not an algorithm.
            </p>
          </div>
          <div className="three">
            <div className="tway hl reveal">
              <div className="who">For practice owners &amp; teams</div>
              <h3>Members</h3>
              <ul>
                <li>Hotline with written action plans</li>
                <li>Resource library</li>
                <li>Partner discounts</li>
                <li>Live AMAs and CE</li>
                <li>Community access</li>
              </ul>
              <a className="btn solid" href="#pricing">Join the network</a>
            </div>
            <div className="tway reveal">
              <div className="who">For coaches, consultants &amp; specialists</div>
              <h3>Experts</h3>
              <ul>
                <li>Done-for-you content library</li>
                <li>Featured expert profile</li>
                <li>Warm leads to your calendar</li>
                <li>Hotline referrals</li>
                <li>Sell courses, keep 70%</li>
              </ul>
              <Link className="btn glass" href="/experts">Apply as an expert</Link>
            </div>
            <div className="tway reveal">
              <div className="who">For companies serving veterinary practices</div>
              <h3>Partners</h3>
              <ul>
                <li>Qualified member leads + dashboard</li>
                <li>Profile &amp; directory placement</li>
                <li>Verified Partner badge</li>
                <li>Podcast, webinar &amp; event features</li>
                <li>Co-marketing access</li>
              </ul>
              <Link className="btn glass" href="/partners">Apply as a partner</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="reveal">
            <div className="kicker">Questions</div>
            <div className="h2">Everything else</div>
          </div>
          <Faq />
        </div>
      </section>

      {/* CTA */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta reveal">
            <h2>Claim one of the first 100 founding spots.</h2>
            <p>$49/mo locked for life, a written plan for every problem, and deals that can cover your dues.</p>
            <Link
              className="btn glass"
              href="/join?plan=founding"
              style={{ fontSize: 16, padding: "15px 32px", background: "#fff", color: "var(--dark)" }}
            >
              Become a founding member →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
