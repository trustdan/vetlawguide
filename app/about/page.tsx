import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Scale, Shield } from "lucide-react";
import { OpenChatLink } from "@/components/chrome/open-chat-link";
import { getCoverageManifest } from "@/lib/corpus/loader";
import {
  CORRECTION_SLA,
  SITE_MAINTAINER,
} from "@/lib/editorial-accountability";
import {
  buildAboutPageJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About VetLawGuide — Point-in-Time Veterans Law Research Desk",
  description:
    "How VetLawGuide pairs historical and modern Title 38 U.S.C., 38 C.F.R., VASRD Diagnostic Codes, and judicial precedents with plain-English Veteran companions and strictly on-device tools.",
  canonicalPath: "/about",
  ogEyebrow: "About the Research Desk",
});

export default function AboutPage() {
  const manifest = getCoverageManifest();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);
  const aboutPageJsonLd = buildAboutPageJsonLd(manifest.checkedAsOf);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(aboutPageJsonLd) }}
      />

      <header className="border-b border-border pb-7">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          About the Research Desk · Corpus Checked {manifest.checkedAsOf}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          About VetLawGuide
        </h1>
        <p className="mt-3 editorial-prose text-foreground">
          VetLawGuide is an independent, primary-source-grounded Veterans Law
          reference library built to help Veterans, Survivors, and accredited
          VA practitioners connect{" "}
          <strong>a specific VA rating or Board decision</strong>,{" "}
          <strong>the exact historical and modern law governing it</strong>, and{" "}
          <strong>the concrete records needed to investigate what happened</strong>
          —with inspectable citations rather than black-box claims.
        </p>

        {/* Dual-persona contextual welcome note */}
        <div
          data-persona="veteran-only"
          className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-foreground"
        >
          <Shield
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <strong>Viewing in Veterans mode:</strong> Every guide leads in
            plain English, explains unfamiliar VA acronyms and form numbers, and
            organizes takeaways as questions to review with a VA-accredited
            representative. Use the{" "}
            <strong>Veterans | Practitioners</strong> switch in the top header
            anytime to inspect practitioner pin-cites.
          </div>
        </div>

        <div
          data-persona="practitioner-only"
          className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-foreground"
        >
          <Scale
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <strong>Viewing in Practitioners mode:</strong> Pages foreground
            verbatim <code className="font-mono text-xs">38 C.F.R.</code>{" "}
            snapshots, Federal Register publication vs. effective dates,
            statutory renumbering (<code className="font-mono text-xs">1933 ↔ 1958 ↔ 1991</code>),
            C-file audit triggers, and collateral finality bars. Switch to{" "}
            <strong>Veterans</strong> mode anytime to preview client-facing
            plain-English companions.
          </div>
        </div>
      </header>

      {/* Live Corpus Snapshot Metrics */}
      <section aria-label="Indexed primary-source totals" className="mt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="font-serif text-2xl font-semibold text-foreground">
              {manifest.totals.upstreamModules}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Primary-source modules &amp; plain-English companions
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="font-serif text-2xl font-semibold text-foreground">
              {manifest.totals.cfrVersionRecords}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Point-in-time <code className="font-mono text-xs">38 C.F.R.</code>{" "}
              snapshots ({manifest.totals.cfrSectionsIndexed} sections)
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="font-serif text-2xl font-semibold text-foreground">
              {manifest.totals.precedentsIndexed}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Judicial precedents &amp; VA General Counsel Precedent (
              <code className="font-mono text-xs">VAOPGCPREC</code>) opinions
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="font-serif text-2xl font-semibold text-foreground">
              {manifest.vasrdSystems.length}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              VASRD (Schedule for Rating Disabilities) body-system hubs
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 space-y-9 editorial-prose">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            1. Why Point-in-Time Veterans Law Matters
          </h2>
          <p className="text-muted-foreground">
            Most online regulation sites show only what{" "}
            <code className="font-mono text-xs">38 C.F.R.</code> says{" "}
            <em>today</em>. When reviewing an older rating decision from{" "}
            <code className="font-mono text-xs">1972</code>,{" "}
            <code className="font-mono text-xs">1995</code>, or{" "}
            <code className="font-mono text-xs">2014</code>, reading modern
            eCFR text can quietly mislead: Diagnostic Codes shift, Title 38
            section numbers changed twice (in{" "}
            <Link
              href="/crosswalk"
              className="font-medium text-primary underline underline-offset-2"
            >
              1958 and 1991
            </Link>
            ), and Federal Register publication dates often precede actual
            effective dates by weeks or months.
          </p>
          <p className="text-muted-foreground">
            At the same time, evaluating an older decision requires separating{" "}
            <strong>the substantive law in force on the decision date</strong>{" "}
            from <strong>the procedural review vehicles available today</strong>
            —including official service-record reconsideration under{" "}
            <Link
              href="/cfr/38-cfr-3.156c"
              className="font-medium text-primary underline underline-offset-2"
            >
              38 C.F.R. § 3.156(c)
            </Link>
            , stabilized-rating reduction protections under{" "}
            <Link
              href="/playbooks/05-void-rating-reductions-stabilized-ratings"
              className="font-medium text-primary underline underline-offset-2"
            >
              38 C.F.R. § 3.344
            </Link>
            , Clear and Unmistakable Error (CUE) limits under{" "}
            <em>George v. McDonough</em> (<code className="font-mono text-xs">§ 20.1403(e)</code>)
            and <code className="font-mono text-xs">§ 20.1409(c)</code>, and
            modern Supplemental Claims.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            2. Four Design Principles
          </h2>
          <ul className="list-disc space-y-2.5 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Honest coverage boundaries (never silent fallbacks):
              </strong>{" "}
              Every regulation version and guide displays its exact verification
              state. Where pre-1990 historical print editions are summarized
              rather than transcribed verbatim, VetLawGuide flags the gap
              explicitly and links directly to official print{" "}
              <code className="font-mono text-xs">38 C.F.R.</code> volumes on
              GovInfo—never substituting modern eCFR text as if it governed an
              earlier era.
            </li>
            <li>
              <strong className="text-foreground">
                Quarantined proposed &amp; rescinded rulemakings:
              </strong>{" "}
              Unfinalized Federal Register Regulatory Identifier Number (
              <code className="font-mono text-xs">RIN</code>) proposals and
              rescinded Interim Final Rules are isolated behind caution striping
              on the{" "}
              <Link
                href="/timeline"
                className="font-medium text-primary underline underline-offset-2"
              >
                Law Timeline
              </Link>{" "}
              and section pages so pending proposals are never mistaken for
              enacted law, and single-judge U.S. Court of Appeals for Veterans
              Claims (<code className="font-mono text-xs">CAVC Rule 30(a)</code>)
              memorandum dispositions on{" "}
              <Link
                href="/cases"
                className="font-medium text-primary underline underline-offset-2"
              >
                Cases &amp; Opinions
              </Link>{" "}
              are clearly marked nonprecedential.
            </li>
            <li>
              <strong className="text-foreground">
                Hash-locked dual-audience translation:
              </strong>{" "}
              Plain-English Veteran companions are cryptographically tied to the
              underlying primary-source module they explain so regulatory
              updates automatically flag plain-English summaries for review, and
              every page lets either audience cross-inspect the other view.
            </li>
            <li>
              <strong className="text-foreground">
                Strictly on-device investigation privacy:
              </strong>{" "}
              Decision dates and{" "}
              <em>Yes / No / I&apos;m not sure</em> answers entered in the{" "}
              <Link
                href="/investigate"
                prefetch={false}
                className="font-medium text-primary underline underline-offset-2"
              >
                Investigate workspace
              </Link>{" "}
              stay strictly in your browser&apos;s temporary memory—never
              written to URLs, never transmitted over the network, and isolated
              from public-page analytics and{" "}
              <OpenChatLink className="font-medium text-primary underline underline-offset-2">
                Research Chat
              </OpenChatLink>{" "}
              (see{" "}
              <Link
                href="/privacy"
                prefetch={false}
                className="font-medium text-primary underline underline-offset-2"
              >
                Privacy &amp; Cookie Choices
              </Link>
              ).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            3. Quick Keyboard &amp; Navigation Tips
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>
              Press{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                ?
              </kbd>{" "}
              anywhere on the site (outside text inputs) to open the quick guide
              and keyboard shortcuts modal.
            </li>
            <li>
              Press{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                ⌘K
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                Ctrl+K
              </kbd>{" "}
              to jump directly to any Diagnostic Code (<code className="font-mono text-xs">DC 5313</code>,{" "}
              <code className="font-mono text-xs">7399-7346</code>),{" "}
              <code className="font-mono text-xs">38 C.F.R.</code> section,
              former <code className="font-mono text-xs">38 U.S.C.</code>{" "}
              citation, legacy VA form, or precedent.
            </li>
            <li>
              Use the <strong>Law as of</strong> date selector in the sticky
              header bar to evaluate regulations on a specific{" "}
              <code className="font-mono text-xs">YYYY-MM-DD</code> decision
              date across the entire site.
            </li>
          </ul>
        </section>

        <section
          aria-labelledby="who-maintains-heading"
          className="space-y-4 rounded-xl border border-border bg-surface-elevated p-5 sm:p-6"
        >
          <h2
            id="who-maintains-heading"
            className="font-serif text-2xl font-semibold text-foreground"
          >
            4. Who maintains this site
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground">
            VetLawGuide is built and maintained by{" "}
            <a
              href={SITE_MAINTAINER.githubProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              {SITE_MAINTAINER.publicLabel}
            </a>{" "}
            ({SITE_MAINTAINER.role}) as an open-source, public-interest Veterans
            Law research reference.
          </p>

          <div className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-foreground">
            <strong>Plain review disclosure:</strong> No VA-accredited attorney,
            claims agent, or Veterans Service Organization (VSO) representative
            has formally reviewed or endorsed the content on this site yet.
            Every module is compiled from public primary sources and checked by
            automated verification scripts—never treat this library as a
            substitute for case-specific review by an accredited representative.
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              How every module is verified &amp; updated
            </h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong className="text-foreground">
                  Official primary source first:
                </strong>{" "}
                Verbatim rules and dates are transcribed from official{" "}
                <code className="font-mono text-xs">GovInfo</code> print/annual{" "}
                <code className="font-mono text-xs">38 C.F.R.</code> editions,{" "}
                <code className="font-mono text-xs">eCFR</code>,{" "}
                <code className="font-mono text-xs">FederalRegister.gov</code>,{" "}
                <code className="font-mono text-xs">Title 38 U.S.C.</code>,
                published judicial reporters, and{" "}
                <code className="font-mono text-xs">VAOPGCPREC</code> opinions.
              </li>
              <li>
                <strong className="text-foreground">
                  Pinned corpus verification:
                </strong>{" "}
                Structured source modules are verified upstream in{" "}
                <code className="font-mono text-xs">VA-law-planning</code> and
                imported via a read-only{" "}
                <code className="font-mono text-xs">SHA-256</code> manifest lock
                (<code className="font-mono text-xs">{manifest.corpusReleaseId}</code>).
              </li>
              <li>
                <strong className="text-foreground">
                  Hash-locked plain-English companions:
                </strong>{" "}
                Each Veteran Mode companion records the{" "}
                <code className="font-mono text-xs">SHA-256</code> hash of the
                legal module it explains plus a{" "}
                <code className="font-mono text-xs">Last reviewed</code> date;
                any upstream legal edit fails CI drift checks until the
                plain-English companion is re-reviewed.
              </li>
              <li>
                <strong className="text-foreground">
                  Automated QA &amp; Federal Register drift gates:
                </strong>{" "}
                Continuous checks enforce publication-vs.-effective date
                separation, <code className="font-mono text-xs">CAVC Rule 30(a)</code>{" "}
                and proposed <code className="font-mono text-xs">RIN</code>{" "}
                quarantines, unauthorized-practice-of-law (UPL) copy boundaries,
                and twice-weekly Federal Register monitoring.
              </li>
            </ol>
          </div>

          <div className="space-y-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              Corrections triage &amp; target turnaround
            </h3>
            <p>
              Use the <strong>Report an error on this page</strong> link in any
              guide or regulation footer (pre-filling the zero-PII{" "}
              <a
                href={SITE_MAINTAINER.githubIssuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                GitHub citation-or-date-fix form
              </a>
              , never including private case details). Primary-source citation,
              effective-date, or precedent-treatment discrepancies are triaged
              within{" "}
              <strong className="text-foreground">
                {CORRECTION_SLA.legalOrDateTriageHours} hours
              </strong>{" "}
              with a target fix published within{" "}
              <strong className="text-foreground">
                {CORRECTION_SLA.legalOrDateFixBusinessDays} business days
              </strong>{" "}
              (plain-English clarity or link fixes within{" "}
              <strong className="text-foreground">
                {CORRECTION_SLA.copyOrLinkReviewBusinessDays} business days
              </strong>
              ).
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            5. Independence, Scope &amp; Accredited Representation
          </h2>
          <p className="text-sm text-muted-foreground">
            VetLawGuide is an independent public-interest legal reference
            project. It is <strong>not affiliated with</strong> the U.S.
            Department of Veterans Affairs, the Board of Veterans&apos; Appeals,
            or the U.S. Court of Appeals for Veterans Claims, and it is{" "}
            <strong>not a law firm or claims-filing service</strong>. Nothing on
            this site or in Research Chat constitutes individualized legal or
            medical advice or creates an attorney-client or representative
            relationship.
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            <a
              href="https://www.va.gov/get-help-from-accredited-representative/find-rep/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
            >
              Find a VA-Accredited VSO, Agent, or Attorney (VA.gov)
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href="https://github.com/trustdan/vetlawguide/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
            >
              Report a Citation or Effective-Date Correction on GitHub (No PII)
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
