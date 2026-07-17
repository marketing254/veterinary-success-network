import Link from "next/link";
import Brand from "./Brand";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div className="about">
            <Brand />
            <p>
              Connecting veterinary practice owners with the experts and companies that help them
              grow. Curated by people, not an algorithm.
            </p>
          </div>
          <div>
            <h5>Network</h5>
            <Link href="/#what">What is VSN?</Link>
            <Link href="/#hotline">Hotline</Link>
            <Link href="/#library">Library</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/experts">For Experts</Link>
            <Link href="/partners">For Partners</Link>
          </div>
          <div>
            <h5>Agreements</h5>
            <Link href="/legal/member-agreement">Member Agreement</Link>
            <Link href="/legal/expert-agreement">Expert Agreement</Link>
            <Link href="/legal/partner-agreement">Partner Agreement</Link>
          </div>
          <div>
            <h5>Legal</h5>
            <Link href="/legal/cancellation-policy">Cancellation Policy</Link>
            <Link href="/legal/privacy-policy">Privacy Policy</Link>
            <a href="mailto:hello@veterinarysuccessnetwork.com">hello@veterinarysuccessnetwork.com</a>
          </div>
        </div>
        <div className="assure">
          We do not store patient or client medical data. The Veterinary Success Network is a
          training and education platform.
        </div>
        <div className="fb">
          <span>© 2026 Veterinary Success Network · Powered by Veterinary Business Institute</span>
          <span>Built for practice owners running real businesses.</span>
        </div>
      </div>
    </footer>
  );
}
