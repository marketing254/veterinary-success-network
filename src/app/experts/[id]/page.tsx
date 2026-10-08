import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isHiddenFromDirectory } from "@/lib/directoryVisibility";

export const dynamic = "force-dynamic";

type ExpertPublic = {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  company_name: string | null;
  specialty: string | null;
  topics: string | null;
  bio: string | null;
  website: string | null;
  booking_link: string | null;
  headshot_url: string | null;
};

async function loadExpert(id: string): Promise<ExpertPublic | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabaseAdmin()
    .from("experts")
    .select("id, email, full_name, display_name, company_name, specialty, topics, bio, website, booking_link, headshot_url")
    .eq("id", id)
    .in("status", ["invited", "active"])
    .not("agreement_signed_at", "is", null)
    .not("headshot_url", "is", null)
    .not("bio", "is", null)
    .maybeSingle();
  if (!data || isHiddenFromDirectory(data.email)) return null;
  return data as ExpertPublic;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const e = await loadExpert(params.id);
  if (!e) return { title: "Expert | Veterinary Success Network", robots: { index: false } };
  const name = e.display_name || e.full_name;
  return {
    title: `${name} | Veterinary Success Network experts`,
    description: e.specialty || `${name} is a vetted expert on the Veterinary Success Network.`,
    alternates: { canonical: `/experts/${e.id}` },
  };
}

export default async function ExpertProfilePage({ params }: { params: { id: string } }) {
  const e = await loadExpert(params.id);
  if (!e) notFound();
  const name = e.display_name || e.full_name;
  const topics = (e.topics || "").split(/,|\n/).map((t) => t.trim()).filter(Boolean).slice(0, 12);
  const paragraphs = (e.bio || "").split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <Nav active="experts" cta={{ href: "/join", label: "Become a member" }} />
      <section className="sec" style={{ paddingTop: 30 }}>
        <div className="wrap">
          <div className="applygrid" style={{ marginTop: 0 }}>
            <article className="formcard">
              <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.headshot_url || ""} alt={name} style={{ width: 128, height: 128, borderRadius: 28, objectFit: "cover", boxShadow: "0 14px 34px rgba(28,51,16,.16)" }} />
                <div>
                  <div className="kicker" style={{ textAlign: "left" }}>VSN Expert</div>
                  <h1 style={{ fontSize: 36, color: "var(--dark)", lineHeight: 1.1, margin: "6px 0 6px", fontWeight: 600 }}>{name}</h1>
                  {e.specialty && <p style={{ fontSize: 16, color: "var(--muted)", margin: 0 }}>{e.specialty}</p>}
                  {e.company_name && <p style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 0" }}>{e.company_name}</p>}
                </div>
              </div>
              <div style={{ marginTop: 26 }}>
                {paragraphs.map((p, i) => (
                  <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)", marginBottom: 12 }}>{p}</p>
                ))}
              </div>
              {topics.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--green)", marginBottom: 10 }}>Teaches</div>
                  <div className="chips" style={{ marginTop: 0 }}>
                    {topics.map((t) => <span className="chip" key={t} style={{ cursor: "default" }}>{t}</span>)}
                  </div>
                </div>
              )}
            </article>
            <aside className="aside-card">
              <span className="atag">Book a meeting</span>
              <h3>Talk to {name.split(/\s+/)[0]}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>Members reach experts directly. Expert Hotline referrals are routed by fit, never pay-to-play.</p>
              {e.booking_link && (
                <a className="btn solid" href={e.booking_link} target="_blank" rel="noreferrer" style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>Book a meeting</a>
              )}
              {e.website && (
                <a className="btn glass" href={e.website} target="_blank" rel="noreferrer" style={{ width: "100%", justifyContent: "center" }}>Website</a>
              )}
              <div className="fine">Not a member yet? <a href="/join" style={{ color: "var(--deep)", fontWeight: 700 }}>Reserve your founding spot</a> to get a written action plan for every practice problem.</div>
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
