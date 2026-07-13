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
            <a href="#">Member Agreement</a>
            <a href="#">Partner Agreement</a>
          </div>
          <div>
            <h5>Legal</h5>
            <a href="#">Cancellation Policy</a>
            <a href="#">Privacy Policy</a>
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
