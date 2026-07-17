"use client";

import { FormEvent, useState } from "react";
import { useVsnSubmit, mailtoFallback, SuccessPanel, ErrorPanel, Honeypot, AgreementCheck } from "./shared";
import NiceSelect from "./NiceSelect";

export const PARTNER_CATEGORIES = [
  "Veterinary supplies & distributors",
  "Equipment & clinic build-outs",
  "Practice-management software",
  "Billing & credentialing",
  "HR, payroll & compliance",
  "Client financing",
  "Phones, call-tracking & AI",
  "Coaching & consulting",
  "Continuing education",
  "Accounting, tax & CFO",
  "Other",
];

const RESPONSE_TIMES = ["Same business day", "Within 1 business day", "Longer than a business day"];

export default function PartnerApplicationForm() {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOther, setCategoryOther] = useState("");
  const [categoryErr, setCategoryErr] = useState(false);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memberOffer, setMemberOffer] = useState("");
  const [leadResponseTime, setLeadResponseTime] = useState(RESPONSE_TIMES[1]);
  const [notes, setNotes] = useState("");
  const [bt, setBt] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeErr, setAgreeErr] = useState(false);

  const { status, serverMessage, submit } = useVsnSubmit("/api/partner/signup");

  const categoryFinal =
    category === "Other" && categoryOther.trim() ? `Other: ${categoryOther.trim()}` : category;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category) {
      setCategoryErr(true);
      return;
    }
    if (!agreed) {
      setAgreeErr(true);
      return;
    }
    submit({
      companyName,
      website,
      category: categoryFinal,
      contactName,
      email,
      phone,
      memberOffer,
      leadResponseTime,
      notes,
      agreementAccepted: agreed,
      bt,
    });
  }

  if (status === "success") {
    return (
      <SuccessPanel title="Application received.">
        The Veterinary Business Institute team reviews every partner by hand. Expect a reply by
        email within a few business days. If it&apos;s a fit, we&apos;ll confirm your category, your member
        offer and your founding placement.
      </SuccessPanel>
    );
  }

  return (
    <form className="vsn-form" onSubmit={onSubmit}>
      <Honeypot value={bt} onChange={setBt} />

      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="pf-company">Company name</label>
          <input type="text" id="pf-company" required autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="frow">
          <label className="flab" htmlFor="pf-web">Website</label>
          <input type="text" id="pf-web" required placeholder="yourcompany.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label className="flab" htmlFor="pf-cat">Your category</label>
        <NiceSelect
          id="pf-cat"
          value={category}
          options={PARTNER_CATEGORIES}
          invalid={categoryErr}
          onChange={(v) => {
            setCategory(v);
            setCategoryErr(false);
          }}
        />
        {categoryErr && <span className="nsel-err">Please choose your category.</span>}
        {category === "Other" && (
          <input
            type="text"
            required
            placeholder="Tell us your category"
            style={{ marginTop: 10 }}
            value={categoryOther}
            onChange={(e) => setCategoryOther(e.target.value)}
          />
        )}
      </div>
      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="pf-name">Contact name</label>
          <input type="text" id="pf-name" required autoComplete="name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="frow">
          <label className="flab" htmlFor="pf-email">Email</label>
          <input type="email" id="pf-email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label className="flab" htmlFor="pf-phone">
          Phone <small>(optional)</small>
        </label>
        <input type="tel" id="pf-phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="frow">
        <label className="flab" htmlFor="pf-offer">The exclusive member deal you&apos;d offer</label>
        <textarea
          id="pf-offer"
          required
          placeholder="A discount or benefit better than your standard pricing. The bar: our founding partner Ekwa gives members $250 off each of the first 2 months."
          value={memberOffer}
          onChange={(e) => setMemberOffer(e.target.value)}
        />
      </div>
      <div className="frow">
        <label className="flab">How fast can you respond to member leads?</label>
        <div className="optrow">
          {RESPONSE_TIMES.map((t, i) => (
            <label className="opt" key={t}>
              <input type="radio" name="leadResponseTime" checked={leadResponseTime === t} onChange={() => setLeadResponseTime(t)} />
              <span>{["Same business day", "Within 1 business day", "Longer"][i]}</span>
            </label>
          ))}
        </div>
        <p className="fnote">
          Partners commit to responding within one business day. If that&apos;s not realistic for your
          team yet, tell us and we&apos;ll talk it through.
        </p>
      </div>
      <div className="frow">
        <label className="flab" htmlFor="pf-notes">
          Anything else? <small>(optional)</small>
        </label>
        <textarea id="pf-notes" style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <AgreementCheck
        id="pf-agree"
        checked={agreed}
        invalid={agreeErr}
        onChange={(v) => {
          setAgreed(v);
          setAgreeErr(false);
        }}
        href="/legal/partner-agreement"
        label="VSN Partner Agreement"
      />

      <button className="btn solid" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Apply for the founding spot →"}
      </button>
      <p className="fnote">
        Founding partners lock the ramp ($0 for 6 months → $49 → $199) and priority placement in
        the directory launch. Leads route by fit, never pay-to-play.
      </p>
      {status === "error" && (
        <ErrorPanel
          message={serverMessage}
          mailto={mailtoFallback("partner-application", {
            Company: companyName,
            Website: website,
            Category: categoryFinal,
            "Contact name": contactName,
            Email: email,
            Phone: phone,
            "Member offer": memberOffer,
            "Lead response time": leadResponseTime,
            Notes: notes,
          })}
          mailtoLabel="Send your application by email instead →"
        />
      )}
    </form>
  );
}
