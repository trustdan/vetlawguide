import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GuidesDirectoryClient } from "@/components/bitemporal/guides-directory-client";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import {
  getChecklistDocuments,
  getCoverageManifest,
  getDoctrineDocuments,
  getPlaybookDocuments,
} from "@/lib/corpus/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides, Legal Treatises & Pre-Filing Checklists",
  description:
    "Practical Veterans Law guides, substantive Title 38 treatises, and pre-filing verification checklists with plain-English companions and primary-source citations.",
  canonicalPath: "/playbooks",
  ogEyebrow: "Guides · Treatises · Checklists",
});

export default function PlaybooksIndexPage() {
  const manifest = getCoverageManifest();
  const playbooks = getPlaybookDocuments()
    .filter((d) => d.status !== "HELD_AT_GATE")
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const treatises = getDoctrineDocuments()
    .filter((d) => d.status !== "HELD_AT_GATE")
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const checklists = getChecklistDocuments()
    .filter((d) => d.status !== "HELD_AT_GATE")
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/guides.webp"
            alt=""
            width={72}
            height={72}
            unoptimized
            className="h-18 w-18 object-cover"
          />
        </div>
        <div className="min-w-0 space-y-3">
          <h1
            data-persona="veteran-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Guides, Checklists &amp; Plain-English Explanations
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Issue-Spotting Guides, Legal Treatises &amp; Pre-Filing Checklists
          </h1>
          <p
            data-persona="veteran-only"
            className="editorial-prose text-muted-foreground"
          >
            <LexiconText text="Practical guides explaining common historical rating rules across disability compensation, survivor DIC, Character of Discharge, Special Monthly Compensation (SMC), toxic exposure, and military retiree offsets—plus record clues and questions for an accredited representative." />
          </p>
          <p
            data-persona="practitioner-only"
            className="editorial-prose text-muted-foreground"
          >
            All {playbooks.length} issue-spotting guides, {treatises.length} legal treatises,
            and {checklists.length} pre-filing verification checklists compiled from primary
            sources (checked <span className="font-mono">{manifest.checkedAsOf}</span>), with
            C-file triggers, kill switches, and linked{" "}
            <code className="font-mono text-sm">38 C.F.R.</code> snapshots.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium">
            <Link
              href="/vasrd"
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
            >
              Disability ratings →
            </Link>
            <Link
              href="/eras"
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
            >
              Historical eras →
            </Link>
            <Link
              href="/crosswalk"
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
            >
              Statutory crosswalk →
            </Link>
            <Link
              href="/reference/forms-and-codes"
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
            >
              Forms decoder →
            </Link>
          </div>
        </div>
      </header>

      <GuidesDirectoryClient
        playbooks={playbooks}
        treatises={treatises}
        checklists={checklists}
      />
    </main>
  );
}
