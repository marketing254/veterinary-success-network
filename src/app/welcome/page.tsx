import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Welcome | Veterinary Success Network", robots: { index: false } };

/** Stripe Checkout success page. The webhook creates the member; this page only confirms. */
export default function WelcomePage() {
  return (
    <>
      <Nav cta={null} />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="formcard narrow">
            <div className="fsuccess show">
              <div className="tkbig"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg></div>
              <h3>You&apos;re in.</h3>
              <p>Your membership is active. A welcome email is on its way, and your Stripe receipt arrives separately. The member portal opens at launch; you sign in with a 6-digit code to the email you paid with.</p>
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <Link className="btn solid" href="/" style={{ justifyContent: "center" }}>Back to the network</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
