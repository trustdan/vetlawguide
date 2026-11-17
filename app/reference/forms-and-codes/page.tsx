import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { FormsCodesDecoder } from "@/components/bitemporal/forms-codes-decoder";
import { VeteranOverlayCard } from "@/components/bitemporal/veteran-overlay-card";
import {
  getCompiledLexicon,
  getCoverageManifest,
  getVeteranOverlaysById,
} from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Legacy VA Forms, Military Records & Rating Code-Sheet Decoder",
};

export default function FormsAndCodesPage() {
  const manifest = getCoverageManifest();
  const lexicon = getCompiledLexicon();
  const overlaysById = getVeteranOverlaysById();
  const formsOverlay = overlaysById["doctrine-forms-and-codesheet-lexicon"];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Plain-English Decoder: Old VA Forms, Military Records &amp; Rating Code Sheets
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Historical VA Forms, Military Clinical Records &amp; Code-Sheet Lexicon ({lexicon.length} Entries)
        </h1>
        <p
          data-persona="veteran-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          Translate unfamiliar form numbers (<code className="font-mono text-xs">8-526</code>,{" "}
          <code className="font-mono text-xs">10-7131</code>,{" "}
          <code className="font-mono text-xs">DD 1380</code>), VA acronyms, and
          hyphenated Rating Code Sheet numbers into clear plain English.
        </p>
        <p
          data-persona="practitioner-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          Decode pre-2015 informal claim triggers, NARA/STR surgical tags,{" "}
          <code className="font-mono text-xs">38 C.F.R. §§ 4.20 / 4.27</code> hyphenated
          analogous codes, and Rating Code Sheet protection notations.
        </p>
      </header>

      <CoverageBanner
        state="VERBATIM_VERIFIED"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail="Compiled from Wave 1 forms-and-codesheet lexicon + SHA-256-locked Veteran companion."
        officialEcfrUrl="https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.27"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      {formsOverlay && (
        <CrossInspectionExpander
          veteranContent={<VeteranOverlayCard overlay={formsOverlay} />}
          practitionerContent={
            <div className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed text-muted-foreground">
              <div className="font-semibold text-foreground">
                Practitioner C-File &amp; Rating Code-Sheet Audit Summary
              </div>
              <p>
                Audit pre-March 24, 2015 <code className="font-mono">VA Form 21-4138</code>{" "}
                statements and <code className="font-mono">VA Form 10-7131</code> hospital
                notices under former{" "}
                <code className="font-mono">38 C.F.R. §§ 3.155(a) &amp; 3.157(b)</code> (
                <em>Shea</em>; <em>Pacheco</em>); verify{" "}
                <code className="font-mono">DD 1380</code> / Clinical Record Cover Sheet
                inpatient surgical tags for{" "}
                <code className="font-mono">38 C.F.R. § 3.156(c)</code>; and decode two-part{" "}
                <code className="font-mono">xx99-xxxx</code> codes under{" "}
                <code className="font-mono">38 C.F.R. §§ 4.20 &amp; 4.27</code>.
              </p>
              <Link
                href="/docs/forms-and-codesheet-lexicon"
                className="inline-flex min-h-6 items-center gap-1 font-semibold text-primary hover:underline"
              >
                <span>Open Full 3-Column Forms &amp; Code-Sheet Treatise</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          }
        />
      )}

      <FormsCodesDecoder entries={lexicon} />
    </main>
  );
}
