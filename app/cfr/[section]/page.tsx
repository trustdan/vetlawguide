import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CfrSectionWorkspace } from "@/components/bitemporal/cfr-section-workspace";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import {
  getCompiledCfrSectionBySlug,
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  buildBreadcrumbJsonLd,
  buildCfrLegislationJsonLd,
} from "@/lib/seo/json-ld";
import { buildCfrSectionMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ section: string }> {
  return getCompiledCfrSections().map((s) => ({
    section: s.sectionSlug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const compiled = getCompiledCfrSectionBySlug(section);
  if (!compiled) {
    return { title: "38 C.F.R. Section Not Found" };
  }
  return buildCfrSectionMetadata(compiled);
}

export default async function CfrSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const compiled = getCompiledCfrSectionBySlug(section);
  if (!compiled) {
    notFound();
  }

  const manifest = getCoverageManifest();
  const leadSnapshot =
    compiled.versions[compiled.versions.length - 1] ??
    compiled.quarantinedWatchlist[0] ??
    null;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "38 C.F.R. Index", path: "/cfr" },
          { name: compiled.cfrSection, path: `/cfr/${compiled.sectionSlug}` },
        ])}
      />
      {leadSnapshot && (
        <JsonLdScript
          data={buildCfrLegislationJsonLd(
            compiled,
            leadSnapshot,
            manifest.checkedAsOf,
          )}
        />
      )}
      <nav aria-label="Breadcrumb" className="text-xs">
        <Link
          href="/cfr"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Point-in-Time 38 C.F.R. Index</span>
        </Link>
      </nav>

      <header className="space-y-2 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-primary">
          <span>{compiled.cfrSection}</span>
          {compiled.diagnosticCodes.length > 0 && (
            <span>· DC {compiled.diagnosticCodes.join(", ")}</span>
          )}
          {compiled.statutes.length > 0 && (
            <span>· {compiled.statutes.join(", ")}</span>
          )}
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {compiled.cfrSection} — {compiled.title}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <LexiconText text={compiled.summary} />
        </p>
      </header>

      <CfrSectionWorkspace
        section={compiled}
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        activeBookmarkWave={manifest.activeBookmarkWave}
      />
    </main>
  );
}
