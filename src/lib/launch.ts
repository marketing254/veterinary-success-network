/**
 * Member launch switch. While MEMBER_LAUNCH_ENABLED is not "true":
 *  - members get only the waitlist confirmation (no other member email)
 *  - no member sign-in codes, no member checkout, no member portal
 * Experts and partners are unaffected. The admin flips it at launch, then sends
 * the launch email from the admin console.
 */
export const MEMBER_LAUNCH_ENABLED =
  process.env.MEMBER_LAUNCH_ENABLED === "true" || process.env.NEXT_PUBLIC_MEMBER_LAUNCH_ENABLED === "true";

export const MEMBER_LAUNCH_MESSAGE =
  "Member sign-in opens when the network launches. You are on the founding waitlist and we will email you first.";
