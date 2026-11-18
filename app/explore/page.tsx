import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { OsintKnowledgeTree } from "@/components/bitemporal/osint-knowledge-tree";
import { extractBrowseCatalog } from "@/lib/corpus/knowledge-tree";
import { getCoverageManifest } from "@/lib/corpus/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Browse Topics, Rating Schedules, Review Options & Survivor Guides",
  description:
    "Browse VA disability ratings, older decisions and review options, survivor and family benefits, forms and code-sheet decoders, and point-in-time Title 38 law.",
  canonicalPath: "/explore",
  ogEyebrow: "Browse by Visitor Need",
});

export default function ExplorePage() {
  const manifest = getCoverageManifest();
  const catalog = extractBrowseCatalog(manifest);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-10">
      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/browse-topics.webp"
            alt=""
            width={72}
            height={72}
            unoptimized
            className="h-18 w-18 object-cover"
          />
        </div>

        <div className="min-w-0 space-y-2">
          <h1
            data-persona="veteran-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Browse Topics &amp; Situations
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Browse Title 38 Topics, Schedules &amp; Review Vehicles
          </h1>

          <p
            data-persona="veteran-only"
            className="editorial-prose text-muted-foreground"
          >
            <LexiconText text="Open any folder below to find plain-English guides, body-system rating rules, survivor DIC checklists, and the exact regulations in effect on your Decision Date." />
          </p>
          <p
            data-persona="practitioner-only"
            className="editorial-prose text-muted-foreground"
          >
            Searchable topic directory and point-in-time authority map across{" "}
            {manifest.totals.upstreamModules} primary-source modules,{" "}
            {manifest.vasrdSystems.length} rating-schedule hubs, and{" "}
            {manifest.totals.precedentsIndexed} judicial and{" "}
            <code className="font-mono text-sm">VAOPGCPREC</code> authorities
            (checked <span className="font-mono">{manifest.checkedAsOf}</span>).
          </p>
        </div>
      </header>

      {/* Searchable 5-Branch Directory (Default) + Secondary Short-Label Map */}
      <OsintKnowledgeTree defaultDate={manifest.checkedAsOf} catalog={catalog} />

      {/* Direct Reference Tool Links (Replaces Duplicate Crosswalk Table & Lexicon Grid) */}
      <section
        aria-label="Supporting reference decoders"
        className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5 text-sm"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Dedicated lookup tools:
        </span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href="/explore/diagnostic-codes"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>Diagnostic Code Jump Directory (DC 5000–9918)</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/explore/cfr-directory"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>38 C.F.R. Permalink Directory</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/crosswalk"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>
              Three-Era Statutory Crosswalk ({manifest.totals.statutoryCrosswalkEntries}{" "}
              mappings)
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/reference/forms-and-codes"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>
              Forms, Acronyms &amp; Analogous Code Decoder (
              {manifest.totals.lexiconEntries} entries)
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/timeline"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>Multi-Track Law Timeline (1945–Present)</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/explore/piercing-finality"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>Piercing-Finality Decision Flowchart</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/eras"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>Historical Era Definitions</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
