import Link from "next/link";
import Nav from "./Nav";
import Footer from "./Footer";

export const LEGAL_PAGES: [string, string][] = [
  ["/legal/member-agreement", "Member Agreement"],
  ["/legal/expert-agreement", "Expert Agreement"],
  ["/legal/partner-agreement", "Partner Agreement"],
  ["/legal/cancellation-policy", "Cancellation Policy"],
  ["/legal/privacy-policy", "Privacy Policy"],
];

type Props = {
  title: string;
  meta: string;
  children: React.ReactNode;
};

/** Shared frame for the agreement/policy pages — the HTML here is the source of truth. */
export default function LegalShell({ title, meta, children }: Props) {
  return (
    <>
      <Nav cta={{ href: "/join", label: "Become a member" }} />
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <article className="legal">
            <div className="brandline">
              Veterinary Success Network
              <small>Powered by Veterinary Business Institute</small>
            </div>
            <h1>{title}</h1>
            <div className="meta">{meta}</div>
            {children}
            <div className="xlinks">
              {LEGAL_PAGES.map(([href, label]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </div>
            <div className="copyline">
              © 2026 Veterinary Success Network · a service offered by Ekwa Marketing Inc.
            </div>
          </article>
        </div>
      </section>
      <Footer />
    </>
  );
}
