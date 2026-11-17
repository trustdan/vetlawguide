import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { InvestigationWorkspace } from "@/components/investigate/investigation-workspace";
import {
  getCompiledCfrSections,
  getCompiledCfrVersions,
  getCoverageManifest,
} from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Historical Decision Investigation Workspace",
  description:
    "Private, browser-memory-only Yes / No / I'm Not Sure VA decision investigation desk with missing-records checklists, point-in-time 38 C.F.R. snapshots, and printable discussion packets.",
};

export default function InvestigatePage() {
  const manifest = getCoverageManifest();
  const wave1CfrSections = getCompiledCfrSections().filter(
    (s) => s.bookmarkStatus === "WAVE_1_LIVE_VERBATIM",
  );
  const cfrVersions = getCompiledCfrVersions();

  const shortHash = manifest.upstreamCommitSha
    .replace(/^merkle-/, "")
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <header className="space-y-2 border-b border-border pb-5">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>On-Device Browser Memory Only · Zero Network · Zero URL Serialization</span>
        </div>

        <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          <span data-persona="veteran-only">
            Organize Your Records &amp; Questions for an Accredited Representative
          </span>
          <span data-persona="practitioner-only">
            Historical Decision Investigation &amp; Three-Valued Screening Desk
          </span>
        </h1>

        <p
          data-persona="veteran-only"
          className="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm"
        >
          Walk through plain-English <strong>Yes / No / I&apos;m Not Sure</strong>{" "}
          questions about an older VA decision. Every{" "}
          <strong>&ldquo;I&apos;m Not Sure&rdquo;</strong> keeps candidate legal options
          open while building a printable checklist of{" "}
          <LexiconText text="military/VA records and questions to review with an accredited VSO, claims agent, or attorney." />
        </p>
        <p
          data-persona="practitioner-only"
          className="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm"
        >
          Pure client-memory three-valued (
          <code className="font-mono text-xs">Yes / No / Unknown</code>) hypothesis engine
          coupling non-CUE-first vehicle ranking, point-in-time{" "}
          <code className="font-mono text-xs">38 C.F.R.</code> resolution,{" "}
          <code className="font-mono text-xs">§ 20.1409(c)</code> pre-filing gates, and
          corpus-stamped audit packet exports with verified network silence.
        </p>
      </header>

      <InvestigationWorkspace
        cfrSections={wave1CfrSections}
        cfrVersions={cfrVersions}
        activeBookmarkWave={manifest.activeBookmarkWave}
        stamp={{
          corpusReleaseId: manifest.corpusReleaseId,
          checkedAsOf: manifest.checkedAsOf,
          upstreamCommitShort: shortHash,
        }}
      />
    </main>
  );
}
