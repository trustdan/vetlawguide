import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCoverageManifest } from "@/lib/corpus/loader";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { VA_FIND_ACCREDITED_REP_URL } from "@/lib/support-links";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Educational Use & Legal Disclaimer",
  description:
    "Educational-use-only terms for VetLawGuide: no legal or medical advice, no attorney-client or representative relationship, primary-source verification duties, and CC0 / CC BY 4.0 / MIT licensing.",
  canonicalPath: "/terms",
  ogEyebrow: "Terms of Educational Use",
});

export default function TermsPage() {
  const manifest = getCoverageManifest();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Terms of Use", path: "/terms" },
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <header className="border-b border-border pb-6">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Terms of Educational Use · Reviewed {manifest.checkedAsOf}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Terms of Educational Use
        </h1>
        <p className="mt-3 editorial-prose text-muted-foreground">
          VetLawGuide is a free, public-interest Veterans Law reference library
          and on-device preparation aid. By browsing or using this site, you
          acknowledge the educational scope and limitations below.
        </p>
      </header>

      <div className="mt-8 space-y-8 editorial-prose">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            1. Educational Reference Only — Not Legal or Medical Advice
          </h2>
          <p className="text-muted-foreground">
            All regulations, historical statutory crosswalks, plain-English
            companions, checklists, on-device screening results, and Research
            Chat responses on VetLawGuide are provided strictly for{" "}
            <strong className="text-foreground">
              general educational and legal-research reference
            </strong>
            . Nothing on this site constitutes individualized legal, medical, or
            financial advice, nor does it evaluate the complete evidence in any
            individual VA Claims File (C-File).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            2. No Attorney-Client Relationship &amp; Non-Affiliation
          </h2>
          <p className="text-muted-foreground">
            Viewing pages, exporting an on-device worksheet from{" "}
            <Link
              href="/investigate"
              prefetch={false}
              className="font-medium text-primary underline underline-offset-2"
            >
              Investigate
            </Link>
            , submitting a question to Research Chat, or opening a GitHub issue{" "}
            <strong className="text-foreground">
              does not create an attorney-client, claims-agent, or Veterans
              Service Organization (VSO) representative relationship
            </strong>
            . VetLawGuide is an independent project and is not affiliated with
            or endorsed by the U.S. Department of Veterans Affairs, the Board of
            Veterans&apos; Appeals, or the U.S. Court of Appeals for Veterans
            Claims.
          </p>
          <p className="text-muted-foreground">
            To obtain advice on a specific VA claim, appeal, or filing deadline,
            consult a{" "}
            <a
              href={VA_FIND_ACCREDITED_REP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
            >
              <span>VA-accredited VSO, claims agent, or attorney</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            3. Primary-Source Verification, Deadlines &amp; No Warranty
          </h2>
          <p className="text-muted-foreground">
            VetLawGuide is provided{" "}
            <strong className="text-foreground">
              &ldquo;as is&rdquo; and without warranties of any kind
            </strong>
            , express or implied, regarding completeness, currency, or fitness
            for a particular purpose. Before relying on any authority or filing
            any claim or motion—especially time-sensitive direct appeals (such
            as the <strong className="text-foreground">120-day</strong> U.S.
            Court of Appeals for Veterans Claims (CAVC) deadline under{" "}
            <code className="font-mono text-xs">38 U.S.C. § 7266(a)</code>,{" "}
            <strong className="text-foreground">1-year</strong> Appeals
            Modernization Act (AMA) review or survivor substitution windows, or
            Board Clear and Unmistakable Error (CUE) motions governed by the
            single-final-merits-decision rule of{" "}
            <code className="font-mono text-xs">38 C.F.R. § 20.1409(c)</code>
            )—always verify the official <code className="font-mono text-xs">GovInfo</code>{" "}
            print/annual <code className="font-mono text-xs">38 C.F.R.</code>{" "}
            edition, <code className="font-mono text-xs">eCFR</code>,{" "}
            <code className="font-mono text-xs">Federal Register</code>, and
            complete C-file record directly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            4. Privacy, Zero-PII Rule &amp; Acceptable Use
          </h2>
          <p className="text-muted-foreground">
            Never submit Social Security Numbers, VA claim or file numbers,
            service numbers, unredacted medical records, or client-identifying
            C-file excerpts into Research Chat or public GitHub issues. See{" "}
            <Link
              href="/privacy"
              prefetch={false}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Privacy, Cookie Choices &amp; On-Device Isolation
            </Link>{" "}
            for details on how <code className="font-mono text-xs">/investigate</code>{" "}
            operates strictly in local browser memory, how public-page analytics
            consent works, and how PII-scrubbed chat questions are handled, and
            see{" "}
            <Link
              href="/about"
              prefetch={false}
              className="font-semibold text-primary underline underline-offset-2"
            >
              About VetLawGuide
            </Link>{" "}
            for maintainer and editorial governance details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            5. Open-Source &amp; Content Licensing (CC0 / CC BY 4.0 / MIT)
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Federal primary legal sources (Public Domain / CC0 1.0):
              </strong>{" "}
              Verbatim statutes (<code className="font-mono text-xs">38 U.S.C.</code>),
              regulations (<code className="font-mono text-xs">38 C.F.R.</code>),{" "}
              <code className="font-mono text-xs">Federal Register</code>{" "}
              rulemaking preambles, judicial opinions, and VA General Counsel
              Precedent (<code className="font-mono text-xs">VAOPGCPREC</code>)
              opinions are works of the U.S. Federal Government in the public
              domain under{" "}
              <code className="font-mono text-xs">17 U.S.C. § 105</code> (marked{" "}
              <code className="font-mono text-xs">CC0 1.0</code>).
            </li>
            <li>
              <strong className="text-foreground">
                Original editorial syntheses &amp; plain-English companions (CC
                BY 4.0):
              </strong>{" "}
              VetLawGuide&apos;s original historical comparison notes, checklists,
              and plain-English Veteran companions are licensed under{" "}
              <code className="font-mono text-xs">CC BY 4.0</code> (Creative
              Commons Attribution 4.0 International)—you may share and adapt
              them with attribution to VetLawGuide, a link to the canonical
              page, and preservation of educational non-representation notices.
            </li>
            <li>
              <strong className="text-foreground">
                Web application software (MIT License):
              </strong>{" "}
              The VetLawGuide web platform and compiler source code are licensed
              under the <code className="font-mono text-xs">MIT</code> License
              at{" "}
              <a
                href="https://github.com/trustdan/vetlawguide"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
              >
                <span>github.com/trustdan/vetlawguide</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              .
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
