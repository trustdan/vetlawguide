import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { PiercingFinalityFlowchart } from "@/components/bitemporal/piercing-finality-flowchart";
import { VeteranOverlayCard } from "@/components/bitemporal/veteran-overlay-card";
import {
  getCoverageManifest,
  getVeteranOverlaysById,
} from "@/lib/corpus/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Piercing-Finality Decision Flowchart & 6-Gate Audit Sequence",
  description:
    "Interactive 6-gate visual decision flowchart and synchronized 1:1 Accessible Outline auditing void rating reductions (§ 3.344), newly associated service records (§ 3.156(c)), open/pending claims, Nehmer (§ 3.816), RO CUE (§ 3.105(a)), and Board CUE (§ 7111 / § 20.1409(c)).",
  canonicalPath: "/explore/piercing-finality",
  ogEyebrow: "Visual Legal Tool · 6-Gate Audit Sequence",
  ogCite: "38 C.F.R. §§ 3.156(c) · 3.105(a) · 20.1409(c)",
});

export default function PiercingFinalityFlowchartPage() {
  const manifest = getCoverageManifest();
  const overlaysById = getVeteranOverlaysById();
  const finalityOverlay =
    overlaysById["doctrine-procedural-vehicles-piercing-finality"];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link
          href="/explore#older-decisions"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Browse · Older decisions and review options</span>
        </Link>
      </nav>

      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/investigate-decision.webp"
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
            How Older VA Decisions Can Be Reviewed (Step-by-Step Map)
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Piercing-Finality Decision Flowchart &amp; Doctrinal Sequence
          </h1>

          <p
            data-persona="veteran-only"
            className="editorial-prose text-muted-foreground"
          >
            <LexiconText text="Before asking VA to review a past Clear and Unmistakable Error (CUE), check whether an unlawful rating reduction, missing military service records (38 C.F.R. § 3.156(c)), an unanswered appeal, or Agent Orange Nehmer rules apply under normal Veteran-friendly evidence standards." />
          </p>
          <p
            data-persona="practitioner-only"
            className="editorial-prose text-muted-foreground"
          >
            Hand-laid-out 6-gate visual sequence and synchronized{" "}
            <strong>1:1 Accessible Outline</strong> ordering void-ab-initio
            reductions, <code className="font-mono text-sm">§ 3.156(c)</code>{" "}
            reconsideration,{" "}
            <code className="font-mono text-sm">§ 3.156(b)</code> /{" "}
            <code className="font-mono text-sm">§ 5104(b)</code> open-claim
            doctrines, and <em>Nehmer</em> ahead of{" "}
            <code className="font-mono text-sm">§ 3.105(a)</code> AOJ CUE and{" "}
            <code className="font-mono text-sm">§ 7111</code> /{" "}
            <code className="font-mono text-sm">§ 20.1409(c)</code> Board CUE.
          </p>
        </div>
      </header>

      <CoverageBanner
        state="VERBATIM_VERIFIED"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail="Compiled from verified Title 38 finality treatises, point-in-time 38 C.F.R. chains, and SHA-256-locked Veteran plain-English companions."
        officialEcfrUrl="https://www.ecfr.gov/current/title-38"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <PiercingFinalityFlowchart defaultDate={manifest.checkedAsOf} />

      {finalityOverlay && (
        <CrossInspectionExpander
          veteranContent={<VeteranOverlayCard overlay={finalityOverlay} />}
          practitionerContent={
            <div className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed text-muted-foreground">
              <div className="font-semibold text-foreground">
                Practitioner Sequence Rule: Direct Merits &amp; Reconsideration Before CUE
              </div>
              <p>
                Collateral revision under{" "}
                <code className="font-mono">38 U.S.C. §§ 5109A / 7111</code>{" "}
                forecloses duty-to-assist breaches (<em>Cook</em>), evidence
                re-weighing, and post-decision judicial invalidations (
                <em>George v. McDonough</em>;{" "}
                <code className="font-mono">38 C.F.R. § 20.1403(e)</code>), and{" "}
                <code className="font-mono">§ 20.1409(c)</code> permits only one
                final merits Board CUE decision per Board issue. Exhaust{" "}
                <code className="font-mono">§§ 3.344 / 3.105(e)</code>,{" "}
                <code className="font-mono">§ 3.156(c)</code>,{" "}
                <code className="font-mono">§ 3.156(b)</code> (<em>Beraud</em>/
                <em>Lang</em>), <code className="font-mono">§ 5104(b)</code> (
                <em>Hamill</em>), and <code className="font-mono">§ 3.816</code>{" "}
                first.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href="/docs/procedural-vehicles-piercing-finality"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Read full Piercing-Finality treatise</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/investigate"
                  prefetch={false}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Screen a specific decision on your device</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          }
        />
      )}
    </main>
  );
}
