import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { InteractiveCrosswalk } from "@/components/bitemporal/interactive-crosswalk";
import { VeteranOverlayCard } from "@/components/bitemporal/veteran-overlay-card";
import {
  getCoverageManifest,
  getStatutoryCrosswalk,
  getVeteranOverlaysById,
} from "@/lib/corpus/loader";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  buildBreadcrumbJsonLd,
  buildDefinedTermSetJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Three-Era Title 38 Statutory Crosswalk (1933 ↔ 1958 ↔ 1991)",
  description:
    "Translate historical Veterans Regulation No. 1(a) and 1958 Title 38 citations (§ 211(a), § 310, § 355, § 3010, § 4004) into modern 38 U.S.C. section numbers.",
  canonicalPath: "/crosswalk",
  ogEyebrow: "Title 38 Statutory Crosswalk",
  ogCite: "1933 ↔ 1958 ↔ 1991",
});

export default function CrosswalkPage() {
  const manifest = getCoverageManifest();
  const crosswalk = getStatutoryCrosswalk();
  const overlaysById = getVeteranOverlaysById();
  const crosswalkOverlay = overlaysById["doctrine-title-38-statutory-crosswalk"];

  const termSetJsonLd = buildDefinedTermSetJsonLd({
    name: "Three-Era Title 38 U.S.C. Statutory Crosswalk (1933 ↔ 1958 ↔ 1991)",
    description:
      "Mappings across pre-1958 Veterans Regulations, Pub. L. 85-857 (1958), and Pub. L. 102-40 / 102-83 (1991) Title 38 section renumbering.",
    canonicalPath: "/crosswalk",
    terms: crosswalk.map((row) => ({
      termCode: row.eraBSection,
      name: `${row.eraBSection} ↔ ${row.eraCSection}`,
      description: `${row.subject} (Era A: ${row.eraAAuthority})`,
    })),
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Statutory Crosswalk", path: "/crosswalk" },
        ])}
      />
      <JsonLdScript data={termSetJsonLd} />
      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/crosswalk.webp"
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
            Old vs. Modern VA Law Number Translator (1933 ↔ 1958 ↔ 1991)
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Three-Era Title 38 Statutory Crosswalk ({crosswalk.length} Mappings)
          </h1>
          <p
            data-persona="veteran-only"
            className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
          >
            Look up old law numbers from WWII, Korea, Vietnam, or Gulf War VA decision
            letters—such as <code className="font-mono text-xs">Vet. Reg. No. 1(a)</code>{" "}
            or <code className="font-mono text-xs">38 U.S.C. § 310 / § 3010</code>—and see
            their modern equivalents without mistaking a renumbering for a change in rights.
          </p>
          <p
            data-persona="practitioner-only"
            className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
          >
            Map pre-1959 Veterans&apos; Regulations, 1959–1991{" "}
            <code className="font-mono text-xs">Pub. L. 85-857</code> sections, and May/Aug.
            1991 <code className="font-mono text-xs">Pub. L. 102-40 / 102-83</code>{" "}
            renumberings so CUE motions cite the exact statutory designation in force on{" "}
            <code className="font-mono text-xs">T₀</code>.
          </p>
        </div>
      </header>

      <CoverageBanner
        state="VERBATIM_VERIFIED"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail="Compiled deterministically from primary statutory crosswalk tables with SHA-256-locked Veteran companion."
        officialEcfrUrl="https://uscode.house.gov/browse/prelim@title38&edition=prelim"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/uscode"
      />

      {crosswalkOverlay && (
        <CrossInspectionExpander
          veteranContent={<VeteranOverlayCard overlay={crosswalkOverlay} />}
          practitionerContent={
            <div className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed text-muted-foreground">
              <div className="font-semibold text-foreground">
                Practitioner Codification Architecture (1933 → 1959 → May/Aug. 1991)
              </div>
              <p>
                <strong>Era A (Mar. 20, 1933 – Dec. 31, 1958):</strong>{" "}
                <code className="font-mono">Pub. L. 73-2</code> &amp; Presidential{" "}
                <code className="font-mono">Vet. Reg. Nos. 1(a)–12</code> (saved by{" "}
                <code className="font-mono">Pub. L. 85-857 §§ 10–11</code> and{" "}
                <code className="font-mono">38 C.F.R. § 3.953</code>).{" "}
                <strong>Era B (Jan. 1, 1959 – May/Aug. 1991):</strong>{" "}
                <code className="font-mono">Pub. L. 85-857</code> 3- and 4-digit sections.{" "}
                <strong>Era C (1991–Present):</strong>{" "}
                <code className="font-mono">Pub. L. 102-40, § 402</code> (May 7, 1991,
                Parts IV–VI Chs. 51–85) and{" "}
                <code className="font-mono">Pub. L. 102-83, §§ 2, 4, 5</code> (Aug. 6,
                1991, Parts I–III Chs. 1–42).
              </p>
              <Link
                href="/docs/title-38-statutory-crosswalk"
                className="inline-flex min-h-6 items-center gap-1 font-semibold text-primary hover:underline"
              >
                <span>Read the statutory crosswalk treatise</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          }
        />
      )}

      <InteractiveCrosswalk rows={crosswalk} />
    </main>
  );
}
