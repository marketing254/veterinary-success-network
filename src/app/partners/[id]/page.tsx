import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isHiddenFromDirectory } from "@/lib/directoryVisibility";
import PartnerTrack from "@/components/partner/PartnerTrack";

export const dynamic = "force-dynamic";

type P = { id: string; contact_email: string; company_name: string; display_name: string | null; category: string | null; website: string | null; description: string | null; member_offer: string | null; logo_url: string | null; booking_link: string | null; billing_parent_id: string | null; agreement_signed_at: string | null };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = supabaseAdmin();
  const { data } = await db
    .from("partners")
    .select("id, contact_email, company_name, display_name, category, website, description, member_offer, logo_url, booking_link, billing_parent_id, agreement_signed_at")
    .eq("id", id)
    .eq("status", "approved")
    .eq("verified", true)
    .not("logo_url", "is", null)
    .not("description", "is", null)
    .maybeSingle();
  const p = data as P | null;
  if (!p || isHiddenFromDirectory(p.contact_email)) return null;
  if (!p.agreement_signed_at) {
    if (!p.billing_parent_id) return null;
    const { data: parent } = await db.from("partners").select("agreement_signed_at").eq("id", p.billing_parent_id).maybeSingle();
    if (!parent?.agreement_signed_at) return null;
  }
  const [{ data: offers }, { data: items }] = await Promise.all([
    db.from("partner_offers").select("id, headline, discount_value, description, promo_code, redeem_url, valid_to").eq("partner_id", p.id).eq("review_status", "approved").order("created_at", { ascending: false }),
    db.from("partner_catalog_items").select("id, name, tagline, description, price_label, link_url, type").eq("partner_id", p.id).eq("review_status", "approved").order("created_at", { ascending: false }),
  ]);
  db.from("partner_events").insert({ partner_id: p.id, kind: "profile_view" }).then(() => undefined, () => undefined);
  return { p, offers: offers ?? [], items: items ?? [] };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await load(params.id);
  if (!r) return { title: "Partner | Veterinary Success Network", robots: { index: false } };
  const name = r.p.display_name || r.p.company_name;
  return { title: `${name} | Veterinary Success Network partners`, description: r.p.description?.slice(0, 160), alternates: { canonical: `/partners/${r.p.id}` } };
}

export default async function PartnerPublicPage({ params }: { params: { id: string } }) {
  const r = await load(params.id);
  if (!r) notFound();
  const { p, offers, items } = r;
  const name = p.display_name || p.company_name;
  const paragraphs = (p.description || "").split(/\n{2,}|\n/).map((t) => t.trim()).filter(Boolean);

  return (
    <>
      <Nav active="partners" cta={{ href: "/join", label: "Become a member" }} />
      <section className="sec" style={{ paddingTop: 30 }}>
        <div className="wrap">
          <div className="applygrid" style={{ marginTop: 0 }}>
            <article className="formcard">
              <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo_url || ""} alt={name} style={{ width: 120, height: 120, borderRadius: 24, objectFit: "contain", background: "#fff", border: "1px solid var(--line)", padding: 10 }} />
                <div>
                  <div className="kicker" style={{ textAlign: "left" }}>Verified Partner{p.category ? ` · ${p.category}` : ""}</div>
                  <h1 style={{ fontSize: 36, color: "var(--dark)", lineHeight: 1.1, margin: "6px 0 6px", fontWeight: 600 }}>{name}</h1>
                </div>
              </div>
              <div style={{ marginTop: 24 }}>{paragraphs.map((t, i) => <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)", marginBottom: 12 }}>{t}</p>)}</div>
              {items.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "var(--green)", marginBottom: 10 }}>What they offer</div>
                  <div className="steps" style={{ marginTop: 0, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {items.map((it) => (
                      <div className="step" key={it.id} style={{ padding: 20 }}>
                        <h3 style={{ marginTop: 0, fontSize: 17 }}>{it.name}</h3>
                        <p>{it.tagline || it.description.slice(0, 120)}</p>
                        {it.price_label && <p style={{ marginTop: 8, fontWeight: 700, color: "var(--dark)" }}>{it.price_label}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
            <aside className="aside-card">
              <span className="atag">Member offer</span>
              <h3>{offers[0]?.discount_value || "Exclusive pricing for members"}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>{offers[0]?.headline || p.member_offer || "Members get a deal they cannot get anywhere else."}</p>
              {offers.length > 1 && <ul style={{ marginBottom: 14 }}>{offers.slice(1).map((o) => <li key={o.id}>{o.discount_value}: {o.headline}</li>)}</ul>}
              <PartnerTrack partnerId={p.id} bookingLink={p.booking_link} website={p.website} />
              <div className="fine">Offers are redeemed through the member portal. Not a member yet? <a href="/join" style={{ color: "var(--deep)", fontWeight: 700 }}>Reserve your founding spot</a>.</div>
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
