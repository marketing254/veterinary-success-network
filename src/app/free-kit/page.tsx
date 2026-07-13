import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FreeKitForm from "@/components/forms/FreeKitForm";

export const metadata: Metadata = {
  title: "Get the free resource kit | Veterinary Success Network",
  description:
    "Get VSN's first free resource kit when it drops: training video, action guide, checklist and worksheet. 100% free, no membership needed. Powered by Veterinary Business Institute.",
  alternates: { canonical: "/free-kit" },
  openGraph: {
    title: "Get the free resource kit | Veterinary Success Network",
    description: "Training video, action guide, checklist and worksheet. 100% free, no membership needed.",
    url: "/free-kit",
  },
};

export default function FreeKitPage() {
  return (
    <>
      <Nav cta={{ href: "/join", label: "Become a member" }} />

      <header className="hero" style={{ padding: "56px 0 0" }}>
        <div className="wrap">
          <span className="eyebrow">
            <span className="dot"></span> 100% free · no membership needed
          </span>
          <h1 style={{ fontSize: 46 }}>
            Take a kit for a <em>test drive</em>.
          </h1>
          <p className="sub">
            Get our first free resource kit when it drops: a training video from a founding expert,
            an action guide, a checklist and a worksheet your team can use the same day.
          </p>
        </div>
      </header>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="formcard narrow">
            <FreeKitForm />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
