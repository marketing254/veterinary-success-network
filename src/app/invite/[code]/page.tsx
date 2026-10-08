import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "You're invited | Veterinary Success Network", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Personalised landing for a standard invite link. Marks viewed, remembers the code, sends to the right form. */
export default async function InvitePage({ params }: { params: { code: string } }) {
  const code = params.code;
  let row: { id: string; kind: string; full_name: string; company_name: string | null; status: string; expires_at: string } | null = null;
  if (/^[A-Za-z0-9]{6,40}$/.test(code)) {
    const { data } = await supabaseAdmin().from("invite_links").select("id, kind, full_name, company_name, status, expires_at").eq("code", code).maybeSingle();
    row = data;
    if (row && row.status === "active") {
      await supabaseAdmin().from("invite_links").update({ status: "viewed", viewed_at: new Date().toISOString() }).eq("id", row.id);
    }
  }
  // The vsn_invite cookie is set by the middleware on this path; the signup routes consume it.
  const valid = !!row && row.status !== "revoked" && new Date(row.expires_at) > new Date();
  const first = row?.full_name.split(/\s+/)[0];
  const href = row?.kind === "partner" ? "/apply-partner" : "/apply-expert";

  return (
    <>
      <Nav cta={null} />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="formcard narrow" style={{ textAlign: "center" }}>
            {valid && row ? (
              <>
                <div className="kicker">Personal invitation</div>
                <h1 style={{ fontSize: 36, color: "var(--dark)", margin: "10px 0 12px", lineHeight: 1.1, fontWeight: 600 }}>{first}, you&apos;re invited.</h1>
                <p style={{ fontSize: 15.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 22px" }}>
                  {row.kind === "partner"
                    ? `Our team would like ${row.company_name || "your company"} on the Veterinary Success Network partner directory. Apply below and we fast-track your review.`
                    : "Our team would like you on the Veterinary Success Network expert bench. Apply below and we fast-track your review."}
                </p>
                <Link className="btn solid" href={href} style={{ justifyContent: "center" }}>{row.kind === "partner" ? "Apply as a founding partner" : "Apply to the bench"}</Link>
                <p className="fnote" style={{ marginTop: 16 }}>Your application is linked to this invitation automatically.</p>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 30, color: "var(--dark)", margin: "0 0 12px", fontWeight: 600 }}>This invitation link is not active.</h1>
                <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 20 }}>It may have expired or been mistyped. You can still apply the normal way.</p>
                <Link className="btn glass" href="/apply-expert">Apply as an expert</Link>
              </>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
