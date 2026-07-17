"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useVsnSubmit, mailtoFallback, SuccessPanel, ErrorPanel, Honeypot, AgreementCheck } from "./shared";
import NiceSelect from "./NiceSelect";

const ROLES = ["Practice owner", "Co-owner / partner", "Practice manager", "Associate veterinarian", "Other"];

export default function ReservationForm() {
  const params = useSearchParams();
  const initialPlan = ["founding", "early", "standard"].includes(params.get("plan") || "")
    ? (params.get("plan") as string)
    : "founding";
  const initialBilling = params.get("billing") === "yr" ? "annual" : "monthly";

  const [plan, setPlan] = useState(initialPlan);
  const [billing, setBilling] = useState(initialBilling);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [role, setRole] = useState("");
  const [roleOther, setRoleOther] = useState("");
  const [roleErr, setRoleErr] = useState(false);
  const [location, setLocation] = useState("");
  const [firstQuestion, setFirstQuestion] = useState("");
  const [bt, setBt] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeErr, setAgreeErr] = useState(false);

  const { status, serverMessage, submit } = useVsnSubmit("/api/member/reserve");

  const roleFinal = role === "Other" && roleOther.trim() ? `Other: ${roleOther.trim()}` : role;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) {
      setRoleErr(true);
      return;
    }
    if (!agreed) {
      setAgreeErr(true);
      return;
    }
    submit({
      plan,
      billing,
      fullName,
      email,
      phone,
      practiceName,
      role: roleFinal,
      location,
      firstQuestion,
      agreementAccepted: agreed,
      bt,
    });
  }

  if (status === "success") {
    return (
      <SuccessPanel title="Your founding reservation is in.">
        {serverMessage ||
          "We'll confirm by email shortly. When founding doors open you'll get your secure checkout link; your spot and the $49/mo lock are held in reservation order. No payment was taken today."}
      </SuccessPanel>
    );
  }

  return (
    <form className="vsn-form" onSubmit={onSubmit}>
      <Honeypot value={bt} onChange={setBt} />

      <div className="frow">
        <label className="flab">Membership</label>
        <div className="optrow">
          <label className="opt">
            <input type="radio" name="plan" checked={plan === "founding"} onChange={() => setPlan("founding")} />
            <span>
              Founding <small>$49/mo · first 100</small>
            </span>
          </label>
          <label className="opt">
            <input type="radio" name="plan" checked={plan === "early"} onChange={() => setPlan("early")} />
            <span>
              101–500 <small>$99/mo</small>
            </span>
          </label>
          <label className="opt">
            <input type="radio" name="plan" checked={plan === "standard"} onChange={() => setPlan("standard")} />
            <span>
              Standard <small>$199/mo</small>
            </span>
          </label>
        </div>
      </div>

      <div className="frow">
        <label className="flab">Billing preference</label>
        <div className="optrow">
          <label className="opt">
            <input type="radio" name="billing" checked={billing === "monthly"} onChange={() => setBilling("monthly")} />
            <span>Monthly</span>
          </label>
          <label className="opt">
            <input type="radio" name="billing" checked={billing === "annual"} onChange={() => setBilling("annual")} />
            <span>
              Annual <small>2 months free</small>
            </span>
          </label>
        </div>
      </div>

      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="jf-name">Full name</label>
          <input type="text" id="jf-name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="frow">
          <label className="flab" htmlFor="jf-email">Email</label>
          <input type="email" id="jf-email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="jf-phone">
            Mobile phone <small>(optional; hotline replies arrive by text)</small>
          </label>
          <input type="tel" id="jf-phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="frow">
          <label className="flab" htmlFor="jf-practice">Practice name</label>
          <input type="text" id="jf-practice" required autoComplete="organization" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} />
        </div>
      </div>
      <div className="f2col">
        <div className="frow">
          <label className="flab" htmlFor="jf-role">Your role</label>
          <NiceSelect
            id="jf-role"
            value={role}
            options={ROLES}
            invalid={roleErr}
            onChange={(v) => {
              setRole(v);
              setRoleErr(false);
            }}
          />
          {roleErr && <span className="nsel-err">Please choose your role.</span>}
          {role === "Other" && (
            <input
              type="text"
              required
              placeholder="Tell us your role"
              style={{ marginTop: 10 }}
              value={roleOther}
              onChange={(e) => setRoleOther(e.target.value)}
            />
          )}
        </div>
        <div className="frow">
          <label className="flab" htmlFor="jf-loc">
            City &amp; state <small>(optional)</small>
          </label>
          <input type="text" id="jf-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label className="flab" htmlFor="jf-challenge">
          What&apos;s the first problem you&apos;d put on the hotline? <small>(optional)</small>
        </label>
        <textarea
          id="jf-challenge"
          placeholder="Hiring, fees, no-shows, marketing, ops. Anything on your mind."
          value={firstQuestion}
          onChange={(e) => setFirstQuestion(e.target.value)}
        />
      </div>

      <AgreementCheck
        id="jf-agree"
        checked={agreed}
        invalid={agreeErr}
        onChange={(v) => {
          setAgreed(v);
          setAgreeErr(false);
        }}
        href="/legal/member-agreement"
        label="VSN Member Agreement"
      />

      <button className="btn solid" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Reserve my founding spot →"}
      </button>
      <p className="fnote">
        No payment today and no card required. Reserving holds your spot; you only pay when you
        complete checkout after doors open. Cancel anytime · money-back guarantee.
      </p>
      {status === "error" && (
        <ErrorPanel
          message={serverMessage}
          mailto={mailtoFallback("member-reservation", {
            Membership: plan,
            Billing: billing,
            "Full name": fullName,
            Email: email,
            Phone: phone,
            Practice: practiceName,
            Role: roleFinal,
            Location: location,
            "First hotline question": firstQuestion,
          })}
          mailtoLabel="Send your reservation by email instead →"
        />
      )}
    </form>
  );
}
