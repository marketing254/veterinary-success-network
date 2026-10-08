import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { expertAgreementSections, EXPERT_AGREEMENT_VERSION, EXPERT_AGREEMENT_UPDATED, type AgreementSection } from "@/content/legal/expertAgreement";
import { partnerAgreementSections, PARTNER_AGREEMENT_VERSION, PARTNER_AGREEMENT_UPDATED } from "@/content/legal/partnerAgreement";
import { formatLongDate, type ProviderRate } from "@/lib/providerBilling";

/**
 * Pure-JS agreement PDFs (work on Vercel, no headless browser). Layout follows
 * the legal pages on the site (LegalShell): brand line with the VSN monogram,
 * title, version line, italic intro, numbered sections with green bullets.
 *  - draft:  personalised, unsigned, "DRAFT, not yet accepted" line
 *  - signed: same content plus the signature block
 * Headings never sit alone at the bottom of a page; bullets never split.
 * No em-dashes anywhere.
 */
export type AgreementParty = { fullName: string; email: string; companyName?: string | null; founding?: boolean; freeUntil?: Date | null };
export type PartnerParty = { companyName: string; contactName: string; email: string; category?: string | null; memberOffer?: string | null; rate: ProviderRate; freeUntil?: Date | null };
export type AgreementSignature = { acceptedName: string; acceptedTitle?: string | null; acceptedAt: Date; ipHash: string | null; userAgent: string | null; version: string };

let logo: Buffer | null | undefined;
function logoPng(): Buffer | null {
  if (logo !== undefined) return logo;
  try {
    logo = readFileSync(join(process.cwd(), "public", "brand", "vsn-monogram-dark.png"));
  } catch {
    logo = null;
  }
  return logo;
}

const GREEN = "#55B900";
const DEEP = "#3BAB00";
const DARK = "#1c3310";
const INK = "#2c3a22";
const MUTED = "#74806a";
const LINE = "#e9efe1";

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 60, paddingHorizontal: 50, fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.5, color: INK },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  logo: { width: 68, height: 27, marginRight: 12 },
  brandText: { borderLeftWidth: 1, borderLeftColor: LINE, paddingLeft: 12 },
  brand: { fontFamily: "Times-Bold", fontSize: 15, lineHeight: 1.2, color: DARK },
  credit: { fontFamily: "Helvetica-Bold", fontSize: 7, letterSpacing: 1.4, color: DEEP, marginTop: 3, lineHeight: 1.2 },
  rule: { height: 2, backgroundColor: GREEN, marginBottom: 18 },
  title: { fontFamily: "Times-Bold", fontSize: 24, lineHeight: 1.2, color: DARK, marginBottom: 6 },
  meta: { fontFamily: "Helvetica-Bold", fontSize: 9, lineHeight: 1.4, color: MUTED, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: LINE, marginBottom: 12 },
  draft: { fontFamily: "Helvetica-Bold", fontSize: 9, lineHeight: 1.4, color: "#a04b2e", marginBottom: 10 },
  intro: { fontFamily: "Helvetica-Oblique", fontSize: 10, lineHeight: 1.5, color: "#4a5a3f", marginBottom: 14 },
  partyBox: { borderWidth: 1, borderColor: LINE, borderRadius: 6, backgroundColor: "#f6fbf0", paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16 },
  partyRow: { flexDirection: "row", paddingVertical: 2 },
  partyKey: { width: 92, fontSize: 9, lineHeight: 1.4, color: MUTED },
  partyVal: { flex: 1, fontSize: 9.5, lineHeight: 1.4, color: DARK },
  h2: { fontFamily: "Times-Bold", fontSize: 13, lineHeight: 1.3, color: DARK, marginTop: 14, marginBottom: 6 },
  p: { marginBottom: 6, lineHeight: 1.5 },
  li: { flexDirection: "row", marginBottom: 4, paddingLeft: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: GREEN, marginTop: 5, marginRight: 8 },
  liText: { flex: 1, lineHeight: 1.5 },
  sig: { marginTop: 18, borderWidth: 1, borderColor: GREEN, borderRadius: 6, padding: 12, backgroundColor: "#ffffff" },
  sigTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, lineHeight: 1.3, color: DARK, marginBottom: 6 },
  sigRow: { flexDirection: "row", paddingVertical: 1.5 },
  sigKey: { width: 112, fontSize: 8.5, lineHeight: 1.4, color: MUTED },
  sigVal: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 28, left: 50, right: 50, fontSize: 7.5, lineHeight: 1.3, color: "#8fa87a", textAlign: "center" },
  pageNo: { position: "absolute", bottom: 28, right: 50, fontSize: 7.5, color: "#8fa87a" },
});

/** Heading + first block never separate; every bullet is unbreakable. */
function Section({ sec }: { sec: AgreementSection }) {
  const first = sec.paragraphs?.[0] ?? null;
  const restParas = (sec.paragraphs ?? []).slice(first ? 1 : 0);
  const bullets = sec.bullets ?? [];
  const firstBullet = !first && bullets.length ? bullets[0] : null;
  const restBullets = firstBullet ? bullets.slice(1) : bullets;
  return (
    <View>
      <View wrap={false}>
        <Text style={s.h2}>{sec.heading}</Text>
        {first ? <Text style={s.p}>{first}</Text> : null}
        {firstBullet ? (
          <View style={s.li}><View style={s.dot} /><Text style={s.liText}>{firstBullet}</Text></View>
        ) : null}
      </View>
      {restParas.map((p, i) => <Text key={`p${i}`} style={s.p}>{p}</Text>)}
      {restBullets.map((b, i) => (
        <View key={`b${i}`} style={s.li} wrap={false}><View style={s.dot} /><Text style={s.liText}>{b}</Text></View>
      ))}
    </View>
  );
}

type DocProps = { title: string; version: string; updated: string; intro: string; partyRows: [string, string][]; sections: AgreementSection[]; email: string; signature: AgreementSignature | null };

function AgreementDoc({ title, version, updated, intro, partyRows, sections, email, signature }: DocProps) {
  const png = logoPng();
  return (
    <Document title={`VSN ${title}`} author="Veterinary Success Network">
      <Page size="LETTER" style={s.page}>
        <View style={s.brandRow} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
          {png ? <Image src={{ data: png, format: "png" }} style={s.logo} /> : null}
          <View style={s.brandText}>
            <Text style={s.brand}>Veterinary Success Network</Text>
            <Text style={s.credit}>POWERED BY VETERINARY BUSINESS INSTITUTE</Text>
          </View>
        </View>
        <View style={s.rule} fixed />

        <Text style={s.title}>{title}</Text>
        <Text style={s.meta}>Version {version}  ·  Last updated {updated}</Text>
        {!signature ? <Text style={s.draft}>DRAFT, not yet accepted. This copy is personalised for review.</Text> : null}
        <Text style={s.intro}>{intro}</Text>

        <View style={s.partyBox} wrap={false}>
          {partyRows.map(([k, v]) => (
            <View key={k} style={s.partyRow}><Text style={s.partyKey}>{k}</Text><Text style={s.partyVal}>{v}</Text></View>
          ))}
        </View>

        {sections.map((sec) => <Section key={sec.heading} sec={sec} />)}

        {signature ? (
          <View style={s.sig} wrap={false}>
            <Text style={s.sigTitle}>Accepted electronically</Text>
            <View style={s.sigRow}><Text style={s.sigKey}>Name typed</Text><Text style={s.sigVal}>{signature.acceptedName}{signature.acceptedTitle ? `, ${signature.acceptedTitle}` : ""}</Text></View>
            <View style={s.sigRow}><Text style={s.sigKey}>Email</Text><Text style={s.sigVal}>{email}</Text></View>
            <View style={s.sigRow}><Text style={s.sigKey}>Accepted at</Text><Text style={s.sigVal}>{signature.acceptedAt.toISOString()}</Text></View>
            <View style={s.sigRow}><Text style={s.sigKey}>Agreement version</Text><Text style={s.sigVal}>{signature.version}</Text></View>
            <View style={s.sigRow}><Text style={s.sigKey}>IP (hashed)</Text><Text style={s.sigVal}>{signature.ipHash ?? "n/a"}</Text></View>
            <View style={s.sigRow}><Text style={s.sigKey}>Device</Text><Text style={s.sigVal}>{(signature.userAgent ?? "n/a").slice(0, 160)}</Text></View>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          Veterinary Success Network, a service offered by Ekwa Marketing Inc.  ·  legal@veterinarysuccessnetwork.com  ·  www.veterinarysuccessnetwork.com
        </Text>
        <Text style={s.pageNo} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function renderExpertAgreementPdf(party: AgreementParty, signature: AgreementSignature | null): Promise<Buffer> {
  const sections = expertAgreementSections({ founding: party.founding, freeUntil: party.freeUntil ?? null });
  const rows: [string, string][] = [
    ["Expert", party.fullName],
    ["Email", party.email],
    ...(party.companyName ? ([["Company", party.companyName]] as [string, string][]) : []),
    ["Cohort", party.founding ? "Founding expert (12 free months)" : "Expert (6 free months)"],
    ...(party.freeUntil ? ([["Free until", formatLongDate(party.freeUntil)]] as [string, string][]) : []),
  ];
  const buf = await renderToBuffer(
    <AgreementDoc
      title="Expert Agreement"
      version={EXPERT_AGREEMENT_VERSION}
      updated={EXPERT_AGREEMENT_UPDATED}
      intro={`Between the Veterinary Success Network ("VSN", "we", "us"), a service offered by Ekwa Marketing Inc., and the expert named below ("you"). If anything here is unclear, ask us before you accept.`}
      partyRows={rows}
      sections={sections}
      email={party.email}
      signature={signature}
    />
  );
  return Buffer.from(buf);
}

export async function renderPartnerAgreementPdf(party: PartnerParty, signature: AgreementSignature | null): Promise<Buffer> {
  const sections = partnerAgreementSections({ rate: party.rate, freeUntil: party.freeUntil ?? null });
  const rows: [string, string][] = [
    ["Company", party.companyName],
    ["Contact", party.contactName],
    ["Email", party.email],
    ...(party.category ? ([["Category", party.category]] as [string, string][]) : []),
    ...(party.memberOffer ? ([["Member offer", party.memberOffer.slice(0, 300)]] as [string, string][]) : []),
    ["Plan", party.rate === "flat" ? "Flat: $39 a month after the free months, no increase" : "Ladder: $39 a month for 12 months after the free months, then $149"],
    ...(party.freeUntil ? ([["Free until", formatLongDate(party.freeUntil)]] as [string, string][]) : []),
  ];
  const buf = await renderToBuffer(
    <AgreementDoc
      title="Partner Agreement"
      version={PARTNER_AGREEMENT_VERSION}
      updated={PARTNER_AGREEMENT_UPDATED}
      intro={`Between the Veterinary Success Network ("VSN", "we", "us"), a service offered by Ekwa Marketing Inc., and the company named below ("you"). If anything here is unclear, ask us before you accept.`}
      partyRows={rows}
      sections={sections}
      email={party.email}
      signature={signature}
    />
  );
  return Buffer.from(buf);
}
