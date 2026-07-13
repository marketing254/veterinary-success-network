import Link from "next/link";
import Brand from "./Brand";

type NavProps = {
  variant?: "home" | "default";
  active?: "members" | "experts" | "partners";
  cta?: { href: string; label: string } | null;
};

export default function Nav({ variant = "default", active, cta }: NavProps) {
  return (
    <nav>
      <div className="bar">
        <Brand />
        <div className="nlinks">
          {variant === "home" ? (
            <>
              <a href="#what">What is VSN</a>
              <a href="#hotline">Hotline</a>
              <a href="#library">Library</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
              <Link href="/experts">Experts</Link>
              <Link href="/partners">Partners</Link>
            </>
          ) : (
            <>
              <Link href="/" className={active === "members" ? "active" : undefined}>
                For Members
              </Link>
              <Link href="/experts" className={active === "experts" ? "active" : undefined}>
                For Experts
              </Link>
              <Link href="/partners" className={active === "partners" ? "active" : undefined}>
                For Partners
              </Link>
            </>
          )}
          {cta !== null && (
            <Link className="btn solid" href={cta?.href ?? "/join"}>
              {cta?.label ?? "Become a member"}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
