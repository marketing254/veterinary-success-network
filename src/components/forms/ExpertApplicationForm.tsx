"use client";

import { FormEvent, useState } from "react";
import { useVsnSubmit, mailtoFallback, SuccessPanel, ErrorPanel, Honeypot, AgreementCheck } from "./shared";
import NiceSelect from "./NiceSelect";

const YEARS = ["Under 2 years", "2–5 years", "5–10 years", "10+ years"];
const CONTENT = ["Yes, recordings/courses ready", "Some", "Not yet, would record new"];

export default function ExpertApplicationForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [topics, setTopics] = useState("");
  const [years, setYears] = useState("");
  const [yearsErr, setYearsErr] = useState(false);
  const [bookingLink, setBookingLink] = useState("");
  const [existingContent, setExistingContent] = useState(CONTENT[0]);
  const [notes, setNotes] = useState("");
  const [bt, setBt] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeErr, setAgreeErr] = useState(false);

  const { status, serverMessage, submit } = useVsnSubmit("/api/expert/signup");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!years) {
      setYearsErr(true);
      return;
    }
    if (!agreed) {
      setAgreeErr(true);
      return;
    }
    submit({
      fullName,
      email,
      company,
      website,
      topics,
      years,
      bookingLink,
      existingContent,
      notes,
      agreementAccepted: agreed,
      bt,
    });
  }

  if (status === "success") {
    return (
      <SuccessPanel title="Application received.">
        The Veterinary Business Institute team reviews every application by hand. Expect a reply by
        email within a few business days. If it&apos;s a fit, we&apos;ll set up a short call about your topics
        and your kit.
      </SuccessPanel>
    );
  }

  return (
    <form className="vsn-form" onSubmit={onSubmit}>
      <Honeypot value={bt} onChange={setBt} />

      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="ef-name">Full name</label>
          <input type="text" id="ef-name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="frow">
          <label className="flab" htmlFor="ef-email">Email</label>
          <input type="email" id="ef-email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="ef-company">
            Company / brand <small>(optional)</small>
          </label>
          <input type="text" id="ef-company" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="frow">
          <label className="flab" htmlFor="ef-web">Website or LinkedIn</label>
          <input
            type="text"
            id="ef-web"
            required
            placeholder="yoursite.com or linkedin.com/in/you"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
      </div>
      <div className="frow">
        <label className="flab" htmlFor="ef-topics">What do you coach, consult or teach?</label>
        <textarea
          id="ef-topics"
          required
          placeholder="Your specialty and the topics you'd teach members, e.g. associate retention, fee strategy, practice ops, marketing…"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
        />
      </div>
      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="ef-years">Years working with veterinary practices</label>
          <NiceSelect
            id="ef-years"
            value={years}
            options={YEARS}
            invalid={yearsErr}
            onChange={(v) => {
              setYears(v);
              setYearsErr(false);
            }}
          />
          {yearsErr && <span className="nsel-err">Please choose a range.</span>}
        </div>
        <div className="frow">
          <label className="flab" htmlFor="ef-booking">
            Booking / calendar link <small>(optional)</small>
          </label>
          <input type="text" id="ef-booking" placeholder="calendly.com/you" value={bookingLink} onChange={(e) => setBookingLink(e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label className="flab">Do you already have content we could build from?</label>
        <div className="optrow">
          {CONTENT.map((c, i) => (
            <label className="opt" key={c}>
              <input type="radio" name="existingContent" checked={existingContent === c} onChange={() => setExistingContent(c)} />
              <span>{["Yes, plenty", "Some", "Not yet, I'd record new"][i]}</span>
            </label>
          ))}
        </div>
        <p className="fnote">
          Either way works: one recording of you teaching (up to an hour) is all we need; we do the
          production.
        </p>
      </div>
      <div className="frow">
        <label className="flab" htmlFor="ef-notes">
          Anything else? <small>(optional)</small>
        </label>
        <textarea id="ef-notes" style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <AgreementCheck
        id="ef-agree"
        checked={agreed}
        invalid={agreeErr}
        onChange={(v) => {
          setAgreed(v);
          setAgreeErr(false);
        }}
        href="/legal/expert-agreement"
        label="VSN Expert Agreement"
      />

      <button className="btn solid" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Submit my application →"}
      </button>
      <p className="fnote">
        Founding seats carry the best terms VSN will ever offer, and the bench is curated for fit;
        we publish real names only once experts are confirmed. Hotline routing is by fit, never
        pay-to-play.
      </p>
      {status === "error" && (
        <ErrorPanel
          message={serverMessage}
          mailto={mailtoFallback("expert-application", {
            "Full name": fullName,
            Email: email,
            Company: company,
            "Website or LinkedIn": website,
            Topics: topics,
            "Years with veterinary practices": years,
            "Booking link": bookingLink,
            "Existing content": existingContent,
            Notes: notes,
          })}
          mailtoLabel="Send your application by email instead →"
        />
      )}
    </form>
  );
}
