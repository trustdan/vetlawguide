import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CfrSectionWorkspace } from "@/components/bitemporal/cfr-section-workspace";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import {
  getCompiledCfrSectionBySlug,
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";

export const dynamicParams = false;

export function generateStaticParams(): Array<{
  section: string;
  effectiveFrom: string;
}> {
  const params: Array<{ section: string; effectiveFrom: string }> = [];
  for (const sec of getCompiledCfrSections()) {
    for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
      params.push({
        section: sec.sectionSlug,
        effectiveFrom: ver.effective_from,
      });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; effectiveFrom: string }>;
}): Promise<Metadata> {
  const { section, effectiveFrom } = await params;
  const compiled = getCompiledCfrSectionBySlug(section);
  const ver = compiled
    ? [...compiled.versions, ...compiled.quarantinedWatchlist].find(
        (v) => v.effective_from === effectiveFrom,
      )
    : null;
  if (!compiled || !ver) {
    return { title: "38 C.F.R. Snapshot Not Found" };
  }
  const isQuarantined =
    ver.regulatory_status === "proposed-nonbinding" ||
    ver.regulatory_status === "interim-final-rescinded";
  return {
    title: isQuarantined
      ? `${ver.cfr_section} (Quarantined / Not Enacted Notice ${ver.publication_date ?? ver.effective_from}) — ${ver.heading ?? compiled.title}`
      : `${ver.cfr_section} (Effective ${ver.effective_from}) — ${ver.heading ?? compiled.title}`,
  };
}

export default async function CfrVersionPermalinkPage({
  params,
}: {
  params: Promise<{ section: string; effectiveFrom: string }>;
}) {
  const { section, effectiveFrom } = await params;
  const compiled = getCompiledCfrSectionBySlug(section);
  if (!compiled) {
    notFound();
  }

  const allSectionVersions = [...compiled.versions, ...compiled.quarantinedWatchlist];
  const pinnedVersion =
    allSectionVersions.find((v) => v.effective_from === effectiveFrom) ?? null;

  if (!pinnedVersion) {
    notFound();
  }

  const manifest = getCoverageManifest();
  const isQuarantined =
    pinnedVersion.regulatory_status === "proposed-nonbinding" ||
    pinnedVersion.regulatory_status === "interim-final-rescinded";

  const priorVersion = pinnedVersion.supersedes
    ? compiled.versions.find((v) => v.version_id === pinnedVersion.supersedes) ?? null
    : null;
  const nextVersion = pinnedVersion.superseded_by
    ? compiled.versions.find((v) => v.version_id === pinnedVersion.superseded_by) ??
      null
    : null;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
          <Link
            href="/cfr"
            className="font-semibold text-primary hover:underline"
          >
            38 C.F.R. Index
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={`/cfr/${compiled.sectionSlug}`}
            className="font-semibold text-primary hover:underline"
          >
            {compiled.cfrSection}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-foreground">{effectiveFrom}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {priorVersion && (
            <Link
              href={priorVersion.permalink}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 font-mono text-xs font-medium text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              <span>Prior ({priorVersion.effective_from})</span>
            </Link>
          )}
          {nextVersion && (
            <Link
              href={nextVersion.permalink}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 font-mono text-xs font-medium text-foreground hover:bg-muted"
            >
              <span>Superseded By ({nextVersion.effective_from})</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <header className="space-y-2 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-primary">
          <span>Canonical Snapshot Permalink: {pinnedVersion.permalink}</span>
          <span>·</span>
          <span>FR Notice / Pub: {pinnedVersion.publication_date ?? "Baseline"}</span>
          <span>·</span>
          <span>
            {isQuarantined
              ? pinnedVersion.regulatory_status === "interim-final-rescinded"
                ? "Status: Rescinded IFR — Not Enacted Law"
                : "Status: Proposed / Unfinalized — Not Enacted Law"
              : `Effective: ${pinnedVersion.effective_from} → ${pinnedVersion.effective_to ?? "present"}`}
          </span>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {pinnedVersion.cfr_section} — {pinnedVersion.heading ?? compiled.title}
        </h1>
        {pinnedVersion.applicability_and_transition_notes && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            <LexiconText text={pinnedVersion.applicability_and_transition_notes} />
          </p>
        )}
      </header>

      <CfrSectionWorkspace
        section={compiled}
        pinnedVersion={pinnedVersion}
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        activeBookmarkWave={manifest.activeBookmarkWave}
      />
    </main>
  );
}
