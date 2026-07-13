"use client";

import Link from "next/link";
import { useState } from "react";

const PLANS = [
  {
    feat: true,
    tag: "Founding · first 100",
    cap: "Founding member",
    mo: 49,
    yr: 490,
    d: "Price locked for life + founding badge in the member directory.",
    href: "/join?plan=founding",
    label: "Become a founding member",
    solid: true,
  },
  {
    feat: false,
    tag: null,
    cap: "Members 101–500",
    mo: 99,
    yr: 990,
    d: "Early-member rate while the network grows.",
    href: "/join?plan=early",
    label: "Join",
    solid: false,
  },
  {
    feat: false,
    tag: null,
    cap: "Standard",
    mo: 199,
    yr: 1990,
    d: "Full access to the whole network.",
    href: "/join?plan=standard",
    label: "Join",
    solid: false,
  },
];

export default function PricingCards() {
  const [mode, setMode] = useState<"mo" | "yr">("mo");

  return (
    <>
      <div className="reveal" style={{ textAlign: "center" }}>
        <div className="kicker">Founding offer</div>
        <div className="h2">Everything, for less than one office lunch a week.</div>
        <div className="toggle">
          <button className={mode === "mo" ? "on" : undefined} onClick={() => setMode("mo")}>
            Monthly
          </button>
          <button className={mode === "yr" ? "on" : undefined} onClick={() => setMode("yr")}>
            Annual · save 2 months
          </button>
        </div>
      </div>

      <div className="stack reveal">
        {[
          "Expert Hotline: written plan in 2–3 business days",
          "Member-only partner deals (Ekwa: $250 off × 2 months)",
          "Resource library: new kits weekly",
          "Live AMAs & CE every month",
          "Templates, SOPs & scripts",
          "Community of owners, experts & partners",
        ].map((item) => (
          <div className="stackrow" key={item}>
            <span className="nm">
              <span className="tk">✓</span>
              {item}
            </span>
            <span className="vv">Included</span>
          </div>
        ))}
      </div>

      <div className="prices">
        {PLANS.map((p) => (
          <div className={`pcard${p.feat ? " feat" : ""} reveal`} key={p.cap}>
            {p.tag && <div className="tag">{p.tag}</div>}
            <div className="cap">{p.cap}</div>
            <div className="amt">
              ${mode === "mo" ? p.mo : p.yr}
              <span>/{mode}</span>
            </div>
            <div className="d">{p.d}</div>
            <Link
              className={`btn ${p.solid ? "solid" : "glass"}`}
              href={`${p.href}&billing=${mode}`}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {p.label}
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
