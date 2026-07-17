import { escapeHtml } from "./teamNotify";

/**
 * renderBranded() — the rich journey template (ASN format, VSN brand):
 * hidden preview, green top bar, ink header with wordmark + credit line, eyebrow chip,
 * Fraunces headline, bullet sections with green accent dots, pill CTA, closing line,
 * signoff block, reference footer. Email-safe inline styles, plain-text alternative,
 * no em dashes anywhere.
 * paragraphs/bullets/closing accept limited HTML — escape user values at call sites.
 */
export type BrandedInput = {
  preview: string;
  eyebrow: string;
  headline: string;
  paragraphs?: string[];
  sections?: { title: string; bullets: string[] }[];
  cta?: { label: string; href: string };
  /** Paragraph after the CTA, e.g. "Questions? Reply to this email." */
  closing?: string;
  /** Signoff block lines, e.g. ["Welcome aboard.", "The Veterinary Success Network Team", "Powered by Veterinary Business Institute"] */
  signoffLines?: string[];
  /** Small footer note, e.g. "This is an automated confirmation of your reservation on July 17, 2026." */
  footerNote?: string;
  /** e.g. "Reference: 7cf56e68" */
  reference?: string;
};

const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "'Fraunces','Iowan Old Style',Baskerville,'Times New Roman',Georgia,serif";

const DEFAULT_SIGNOFF = [
  "The Veterinary Success Network Team",
  "Powered by Veterinary Business Institute",
];

export function renderBranded(input: BrandedInput): { html: string; text: string } {
  const e = escapeHtml;
  const signoff = input.signoffLines || DEFAULT_SIGNOFF;

  const paragraphsHtml = (input.paragraphs || [])
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:#2c3a22;">${p}</p>`
    )
    .join("");

  const sectionsHtml = (input.sections || [])
    .map(
      (s) => `
        <p style="margin:22px 0 10px;font-family:${SERIF};font-weight:600;font-size:17px;color:#1c3310;">${e(s.title)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${s.bullets
            .map(
              (b) => `
          <tr>
            <td width="18" valign="top" style="padding:6px 0;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#55B900;"></span></td>
            <td style="padding:4px 0;font-family:${SANS};font-size:14.5px;line-height:1.6;color:#2c3a22;">${b}</td>
          </tr>`
            )
            .join("")}
        </table>`
    )
    .join("");

  const ctaHtml = input.cta
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:24px 0 6px;">
          <a href="${input.cta.href}" style="display:inline-block;background:#3BAB00;color:#ffffff;font-family:${SANS};font-size:15px;font-weight:700;text-decoration:none;border-radius:30px;padding:14px 34px;">${e(input.cta.label)}</a>
        </td></tr>
      </table>`
    : "";

  const closingHtml = input.closing
    ? `<p style="margin:18px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.6;color:#2c3a22;">${input.closing}</p>`
    : "";

  const signoffHtml = `
    <p style="margin:24px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.7;color:#2c3a22;">
      ${signoff
        .map((line, i) =>
          i === signoff.length - 1 && signoff.length > 1
            ? `<span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#74806a;font-weight:700;">${e(line)}</span>`
            : `${e(line)}<br>`
        )
        .join("")}
    </p>`;

  const html = `
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${e(input.preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6fbf0;padding:28px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="height:5px;background:#55B900;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="background:#1c3310;padding:22px 32px;">
            <div style="font-family:${SERIF};font-size:20px;color:#f2fae6;">Veterinary Success Network</div>
            <div style="font-family:${SANS};font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#8BE317;margin-top:5px;">Powered by Veterinary Business Institute</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e9efe1;border-top:none;padding:32px;">
            <div style="display:inline-block;background:#eafad6;color:#3f6b1a;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:20px;padding:6px 14px;margin-bottom:16px;">${e(input.eyebrow)}</div>
            <h1 style="margin:0 0 16px;font-family:${SERIF};font-weight:500;font-size:26px;line-height:1.15;color:#1c3310;">${e(input.headline)}</h1>
            ${paragraphsHtml}
            ${sectionsHtml}
            ${ctaHtml}
            ${closingHtml}
            ${signoffHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#1c3310;border-radius:0 0 16px 16px;padding:18px 32px;">
            ${input.footerNote ? `<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.6;color:#b9d3a0;">${e(input.footerNote)}</p>` : ""}
            ${input.reference ? `<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;color:#b9d3a0;">${e(input.reference)}</p>` : ""}
            <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:#8fa87a;">
              Veterinary Success Network &middot; a service offered by Ekwa Marketing Inc. &middot; support@veterinarysuccessnetwork.com<br>
              We do not store patient or client medical data. VSN is a training and education platform.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const strip = (s: string) => s.replace(/<[^>]+>/g, "");
  const text = [
    "Veterinary Success Network",
    "",
    input.headline,
    "",
    ...(input.paragraphs || []).map(strip),
    ...(input.sections || []).flatMap((s) => ["", s.title, ...s.bullets.map((b) => `- ${strip(b)}`)]),
    ...(input.cta ? ["", `${input.cta.label}: ${input.cta.href}`] : []),
    ...(input.closing ? ["", strip(input.closing)] : []),
    "",
    ...signoff,
    ...(input.footerNote ? ["", input.footerNote] : []),
    ...(input.reference ? [input.reference] : []),
  ].join("\n");

  return { html, text };
}
