import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { getCoverageManifest, getDoctrineDocuments } from "@/lib/corpus/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Legal Doctrine Treatises & Plain-English Companions",
  description:
    "Substantive and procedural Veterans Law treatises covering finality, statutory crosswalks, VAOPGCPREC authority, and bitemporal adjudication rules.",
  canonicalPath: "/docs",
  ogEyebrow: "Legal Doctrine Treatises",
});

export default function DocsIndexPage() {
  const manifest = getCoverageManifest();
  const docs = getDoctrineDocuments();
  const liveDocs = docs.filter((d) => d.status !== "HELD_AT_GATE");
  const heldDocs = docs.filter((d) => d.status === "HELD_AT_GATE");
  const overlayCount = liveDocs.filter((d) => Boolean(d.veteranOverlay)).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Plain-English Legal Explainers: Reopening Claims, Old Law Numbers &amp; VA Forms
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Substantive &amp; Procedural Doctrine Treatises ({liveDocs.length} Live)
        </h1>
        <p className="editorial-prose text-muted-foreground">
          All {liveDocs.length} primary-source treatises include structured tables,
          inline citations, and pre-filing cautions ({overlayCount} plain-English
          Veteran companions ready; checked{" "}
          <span className="font-mono">{manifest.checkedAsOf}</span>).
        </p>
      </header>

      <CoverageBanner
        state={
          overlayCount === liveDocs.length
            ? "VERBATIM_VERIFIED"
            : "PLAIN_ENGLISH_IN_PROGRESS"
        }
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail={`${liveDocs.length} primary-source legal treatises live (${overlayCount} SHA-256-locked Veteran plain-English companions authored; remaining modules show inline acronym/form tooltips and C-file clues while plain-English cards are completed).`}
        officialEcfrUrl="https://www.ecfr.gov/current/title-38"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <section aria-labelledby="live-docs-heading" className="space-y-4">
        <h2 id="live-docs-heading" className="font-serif text-xl font-bold">
          Primary-Source Legal Treatises &amp; Crosswalks ({liveDocs.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {liveDocs.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
            >
              <div className="space-y-2">
                <h3
                  data-persona="veteran-only"
                  className="font-serif text-base font-bold text-foreground"
                >
                  {doc.veteranOverlay?.plain_english_title ?? doc.title}
                </h3>
                <h3
                  data-persona="practitioner-only"
                  className="font-serif text-base font-bold text-foreground"
                >
                  {doc.title}
                </h3>

                {doc.veteranOverlay ? (
                  <p
                    data-persona="veteran-only"
                    className="line-clamp-4 text-xs leading-relaxed text-muted-foreground"
                  >
                    <LexiconText text={doc.veteranOverlay.what_this_means} />
                  </p>
                ) : (
                  <p
                    data-persona="veteran-only"
                    className="line-clamp-4 text-xs leading-relaxed text-muted-foreground"
                  >
                    <LexiconText
                      text={
                        doc.cFileTriggers[0] ??
                        "Primary-source Veterans Law reference live with inline VA acronym and form tooltips; dedicated plain-English companion in progress."
                      }
                    />
                  </p>
                )}

                <p
                  data-persona="practitioner-only"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {doc.cfrCitations.slice(0, 3).join(" · ") ||
                    doc.statutes.slice(0, 2).join(" · ")}
                </p>
              </div>

              <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                <Link
                  href={doc.route}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Read the treatise</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {heldDocs.length > 0 && (
        <section aria-labelledby="staged-docs-heading" className="space-y-3">
          <h2 id="staged-docs-heading" className="font-serif text-lg font-semibold">
            Additional Reference Topics
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {heldDocs.map((doc) => (
              <Link
                key={doc.id}
                href={doc.route}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-surface/60 p-3.5 text-xs hover:border-primary"
              >
                <span className="font-medium text-foreground">{doc.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
