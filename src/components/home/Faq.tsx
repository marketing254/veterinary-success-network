"use client";

import { useState } from "react";

const QA: [string, string][] = [
  [
    "What exactly do I get with my membership?",
    "Four core things: the Expert Hotline (a written action plan + 3–4 expert contacts per question), exclusive partner discounts, the growing resource library, and live monthly AMAs & CE, plus templates, SOPs and the member community.",
  ],
  [
    "How does the Expert Hotline actually work?",
    "You call the members' toll-free line and leave a voicemail describing your challenge. Within 2–3 business days you get a reply by text and email: a written recommended path plus 3–4 vetted experts matched to your situation. It's AI-assisted and reviewed by our team. Not a live call line, and not 24/7.",
  ],
  [
    "How do the partner savings work?",
    "Every VSN partner commits to an exclusive member deal better than their standard pricing. Example: our founding marketing partner Ekwa gives members $250 off each of their first 2 months. Use one real deal and the membership can pay for itself.",
  ],
  [
    "What is the founding member rate?",
    "The first 100 members join at $49/mo (or $490/yr), locked for life: it never increases while you stay a member. After the first 100, pricing steps to $99/mo, then $199/mo standard.",
  ],
  [
    "What if I'm not ready to join yet?",
    "Take the free kit for a test drive, no membership needed. You'll see exactly the production quality members get every week.",
  ],
  [
    "I run a small or solo practice. Will I actually use this?",
    "Small practices are exactly who the hotline serves best: you get a specific written plan without hiring a consultant, and the partner deals apply no matter your size. If you genuinely wouldn't use the hotline or the deals, see our honest fit check; it may not be for you.",
  ],
  [
    "Who are the experts?",
    "Coaches, consultants and specialists who work with veterinary practices, hand-picked by the Veterinary Business Institute team and vetted for real operating experience. Routing is by fit; experts never pay for placement.",
  ],
  [
    "Can I cancel anytime?",
    "Yes. Cancel anytime, and there's a money-back guarantee if the membership isn't right for you.",
  ],
  [
    "Do you store patient data?",
    "No. VSN is a training and education platform for practice owners. We don't ask for, or store, patient or client medical data.",
  ],
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="faq">
      {QA.map(([q, a], i) => (
        <div className={`qa${open === i ? " open" : ""}`} key={q}>
          <div className="q" onClick={() => setOpen(open === i ? -1 : i)}>
            {q}
            <span className="pl">+</span>
          </div>
          <div className="a">{a}</div>
        </div>
      ))}
    </div>
  );
}
