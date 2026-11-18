import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCoverageManifest } from "@/lib/corpus/loader";
import { CORRECTION_SLA, SITE_MAINTAINER } from "@/lib/editorial-accountability";
import { buildBreadcrumbJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Accessibility Statement & WCAG 2.2 AA Conformance",
  description:
    "VetLawGuide's WCAG 2.2 Level AA accessibility target, high-zoom reflow and reduced-motion design, accessible outline alternatives, known limitations, and how to report barriers.",
  canonicalPath: "/accessibility",
  ogEyebrow: "Accessibility Statement",
});

export default function AccessibilityPage() {
  const manifest = getCoverageManifest();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Accessibility", path: "/accessibility" },
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <header className="border-b border-border pb-6">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Accessibility Statement · Reviewed {manifest.checkedAsOf}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Accessibility Statement
        </h1>
        <p className="mt-3 editorial-prose text-muted-foreground">
          Veterans, Survivors, and VA Law practitioners rely on screen readers,
          high browser magnification, keyboard-only navigation, and reduced
          visual motion. VetLawGuide is engineered to keep primary legal sources
          and plain-English companions calm, readable, and operable across
          assistive technologies.
        </p>
      </header>

      <div className="mt-8 space-y-8 editorial-prose">
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            1. Conformance Target (WCAG 2.2 Level AA)
          </h2>
          <p className="text-muted-foreground">
            VetLawGuide targets conformance with the{" "}
            <strong className="text-foreground">
              Web Content Accessibility Guidelines (WCAG) 2.2 Level AA
            </strong>{" "}
            across both warm archival light mode and neutral charcoal dark mode.
            Automated{" "}
            <code className="font-mono text-xs">@axe-core/playwright</code>{" "}
            scans, keyboard focus checks, and{" "}
            <code className="font-mono text-xs">400%</code> zoom reflow checks
            run in continuous integration on every pull request.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            2. Built-In Accessibility Measures
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Readable typography &amp; high-zoom reflow:
              </strong>{" "}
              Explanatory prose is set at{" "}
              <code className="font-mono text-xs">16–18px</code> with a strict{" "}
              <code className="font-mono text-xs">13px</code> minimum floor on
              citations and metadata. Sticky chrome collapses on narrow and{" "}
              <code className="font-mono text-xs">200%–400%</code> zoomed
              viewports (<code className="font-mono text-xs">320px</code> CSS
              width) so at least half of the viewport height remains available
              for reading without horizontal page scrolling.
            </li>
            <li>
              <strong className="text-foreground">
                1:1 accessible directory &amp; outline parity:
              </strong>{" "}
              Every interactive SVG visualization—including the{" "}
              <Link
                href="/explore"
                prefetch={false}
                className="font-medium text-primary underline underline-offset-2"
              >
                Browse Topic Map
              </Link>
              , the{" "}
              <Link
                href="/explore/piercing-finality"
                prefetch={false}
                className="font-medium text-primary underline underline-offset-2"
              >
                Piercing-Finality Flowchart
              </Link>
              , and the{" "}
              <Link
                href="/timeline"
                prefetch={false}
                className="font-medium text-primary underline underline-offset-2"
              >
                Law Timeline
              </Link>
              —pairs with a synchronized, keyboard- and screen-reader-accessible
              outline or directory view containing identical authorities and
              links.
            </li>
            <li>
              <strong className="text-foreground">
                Keyboard &amp; touch parity (no hover-only disclosures):
              </strong>{" "}
              Acronym definitions, citation popovers, search (
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                ⌘K
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                Ctrl+K
              </kbd>
              ), quick help (
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                ?
              </kbd>
              ), and dialogs work with{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                Tab
              </kbd>
              ,{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                Enter
              </kbd>
              ,{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">
                Escape
              </kbd>
              , and touch tap—and regulation redline diffs pair color with
              explicit <code className="font-mono text-xs">&lt;del&gt;</code> /{" "}
              <code className="font-mono text-xs">&lt;ins&gt;</code> semantics.
            </li>
            <li>
              <strong className="text-foreground">
                Respecting reduced motion:
              </strong>{" "}
              All non-essential transitions and decorative animations honor{" "}
              <code className="font-mono text-xs">
                prefers-reduced-motion: reduce
              </code>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            3. Known Limitations
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Dense historical comparison tables:
              </strong>{" "}
              Multi-column statutory crosswalks and historical Federal Register
              percentage matrices are wrapped in keyboard-focusable horizontal
              scroll containers (<code className="font-mono text-xs">tabIndex=0</code>)
              so column relationships stay intact on narrow screens without
              causing full-page horizontal overflow.
            </li>
            <li>
              <strong className="text-foreground">
                External government documents:
              </strong>{" "}
              Official primary-source links to external{" "}
              <code className="font-mono text-xs">GovInfo</code> historical PDF
              volumes, <code className="font-mono text-xs">eCFR</code>, and
              court dockets lead to federal sites maintained outside
              VetLawGuide.
            </li>
          </ul>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            4. How to Report an Accessibility Barrier
          </h2>
          <p className="text-sm text-muted-foreground">
            If any page, control, screen-reader announcement, or zoom view gets
            in your way, please open an issue on GitHub describing the page URL,
            browser/assistive technology used, and what happened (please{" "}
            <strong className="text-foreground">
              do not include SSNs, VA claim numbers, or private medical details
            </strong>
            ). Accessibility barriers are triaged within{" "}
            <strong className="text-foreground">
              {CORRECTION_SLA.legalOrDateTriageHours} hours
            </strong>{" "}
            with a target fix within{" "}
            <strong className="text-foreground">
              {CORRECTION_SLA.legalOrDateFixBusinessDays} business days
            </strong>
            .
          </p>
          <div className="pt-1 text-sm">
            <a
              href={`${SITE_MAINTAINER.githubIssuesUrl}/new?template=question.yml&title=%5BAccessibility%5D%3A+`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"
            >
              <span>Report an Accessibility Barrier on GitHub (No PII)</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
