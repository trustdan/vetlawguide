import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Scale } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { ReportPageErrorLink } from "@/components/bitemporal/report-page-error-link";
import {
  DOCUMENT_CATEGORY_LABELS,
  getCompiledCfrSections,
  getCoverageManifest,
  getVeteranOverlaysById,
} from "@/lib/corpus/loader";
import { CANONICAL_VASRD_SYSTEMS } from "@/lib/corpus/types";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildVasrdSystemMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ systemId: string }> {
  return CANONICAL_VASRD_SYSTEMS.map((s) => ({ systemId: s.systemId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ systemId: string }>;
}): Promise<Metadata> {
  const { systemId } = await params;
  const manifest = getCoverageManifest();
  const sys = manifest.vasrdSystems.find((s) => s.systemId === systemId);
  if (!sys) return { title: "VASRD System Not Found" };
  return buildVasrdSystemMetadata(sys);
}

export default async function VasrdSystemDetailPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;
  const manifest = getCoverageManifest();
  const sys = manifest.vasrdSystems.find((s) => s.systemId === systemId);
  if (!sys) notFound();

  const overlaysById = getVeteranOverlaysById();
  const systemModules = manifest.modules.filter((m) => m.vasrdSystem === systemId);
  const linkedCfrSections = getCompiledCfrSections().filter(
    (sec) => sec.vasrdSystem === systemId,
  );

  const allDiagnosticCodes = Array.from(
    new Set(systemModules.flatMap((m) => m.diagnosticCodes)),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Ratings (VASRD)", path: "/vasrd" },
          { name: sys.label, path: `/vasrd/${sys.systemId}` },
        ])}
      />
      <nav aria-label="Breadcrumb" className="text-xs">
        <Link
          href="/vasrd"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to All 15 VASRD Body Systems</span>
        </Link>
      </nav>

      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-primary">
          <span>38 C.F.R. Part 4 · {sys.diagnosticCodeRange}</span>
          <a
            href={sys.officialEcfrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2"
          >
            <span>Current Official eCFR Schedule</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        <h1 className="font-serif text-3xl font-bold tracking-tight">{sys.label}</h1>

        {allDiagnosticCodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Indexed Diagnostic Codes:</span>
            {allDiagnosticCodes.slice(0, 18).map((dc) => (
              <span
                key={dc}
                className="rounded border border-border bg-surface px-2 py-0.5"
              >
                DC {dc}
              </span>
            ))}
          </div>
        )}
      </header>

      <CoverageBanner
        state={sys.coverageState}
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        officialEcfrUrl={sys.officialEcfrUrl}
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <section aria-labelledby="vasrd-modules-heading" className="space-y-4">
        <h2 id="vasrd-modules-heading" className="font-serif text-xl font-bold">
          Verbatim Snapshots, Historical Overhauls &amp; Issue-Spotting Guides (
          {systemModules.length})
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {systemModules.map((mod) => {
            const overlay = overlaysById[mod.id];
            return (
              <article
                key={mod.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
              >
                <div className="space-y-2">
                  <div className="font-mono text-xs font-semibold text-primary">
                    {DOCUMENT_CATEGORY_LABELS[mod.category]}
                  </div>
                  <h3
                    data-persona="veteran-only"
                    className="font-serif text-base font-bold text-foreground"
                  >
                    {overlay?.plain_english_title ?? mod.title}
                  </h3>
                  <h3
                    data-persona="practitioner-only"
                    className="font-serif text-base font-bold text-foreground"
                  >
                    {mod.title}
                  </h3>

                  {overlay ? (
                    <p
                      data-persona="veteran-only"
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      <LexiconText text={overlay.what_this_means} />
                    </p>
                  ) : (
                    <p
                      data-persona="veteran-only"
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      <LexiconText text="Open this guide to inspect historical vs. current rating criteria, record clues, and inline VA acronym explanations." />
                    </p>
                  )}

                  <p
                    data-persona="practitioner-only"
                    className="font-mono text-xs text-muted-foreground"
                  >
                    {mod.cfrCitations.slice(0, 4).join(" · ")}
                  </p>
                </div>

                <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                  <Link
                    href={mod.canonicalRoute}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <span>Open Reference Module</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {linkedCfrSections.length > 0 && (
        <section aria-labelledby="vasrd-cfr-chains-heading" className="space-y-3">
          <h2
            id="vasrd-cfr-chains-heading"
            className="inline-flex items-center gap-2 font-serif text-xl font-bold"
          >
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Point-in-Time Federal Register Transition Chains</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {linkedCfrSections.map((sec) => (
              <Link
                key={sec.sectionSlug}
                href={`/cfr/${sec.sectionSlug}`}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface p-4 text-xs hover:border-primary"
              >
                <div className="space-y-1">
                  <div className="font-mono text-xs font-semibold text-primary">
                    {sec.cfrSection} ({sec.versions.length} snapshot
                    {sec.versions.length === 1 ? "" : "s"})
                  </div>
                  <div className="font-medium text-foreground">{sec.title}</div>
                </div>
                <span className="mt-3 font-mono text-xs font-semibold text-primary">
                  /cfr/{sec.sectionSlug} →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="font-mono">
          Checked as of {manifest.checkedAsOf} · {manifest.corpusReleaseId}
        </span>
        <ReportPageErrorLink
          canonicalPath={`/vasrd/${sys.systemId}`}
          corpusReleaseId={manifest.corpusReleaseId}
          authority={`38 C.F.R. Part 4 (${sys.diagnosticCodeRange}) — ${sys.label}`}
        />
      </footer>
    </main>
  );
}
