import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  getCfrModuleDocuments,
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";
import type { CompiledCfrSection } from "@/lib/corpus/types";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Complete 38 C.F.R. Point-in-Time Permalink Directory (1945–Present)",
  description:
    "Complete HTML jump directory across all indexed Title 38 C.F.R. sections, effective-date snapshot permalinks, multi-section regulatory modules, and quarantined rulemaking notices.",
  canonicalPath: "/explore/cfr-directory",
  ogEyebrow: "Browse · 38 C.F.R. Permalink Index",
  ogCite: "Title 38 C.F.R. · Point-in-Time Snapshots",
});

function extractPartLabel(sec: CompiledCfrSection): string {
  const m = /^38-cfr-(?:part-)?(\d+)\b/i.exec(sec.sectionSlug);
  const partNum = m?.[1] ?? "Other";
  const labels: Record<string, string> = {
    "1": "38 C.F.R. Part 1 — General Provisions & Debt Waivers",
    "3": "38 C.F.R. Part 3 — Adjudication (Compensation, Pension & DIC)",
    "4": "38 C.F.R. Part 4 — Schedule for Rating Disabilities (VASRD)",
    "14": "38 C.F.R. Part 14 — Legal Services, Accreditation & Agent/Attorney Fees",
    "17": "38 C.F.R. Part 17 — Medical Benefits & Emergency Treatment",
    "19": "38 C.F.R. Part 19 — Legacy Board of Veterans' Appeals Rules",
    "20": "38 C.F.R. Part 20 — Board Rules of Practice & CUE (Subpart O)",
    "21": "38 C.F.R. Part 21 — Veteran Readiness and Employment (VR&E)",
    "71": "38 C.F.R. Part 71 — Caregivers Benefits Program",
  };
  return labels[partNum] ?? `38 C.F.R. Part ${partNum}`;
}

export default function CfrPermalinkDirectoryPage() {
  const manifest = getCoverageManifest();
  const sections = getCompiledCfrSections();
  const cfrModules = getCfrModuleDocuments();

  const groupedByPart = new Map<string, CompiledCfrSection[]>();
  for (const sec of sections) {
    const label = extractPartLabel(sec);
    const list = groupedByPart.get(label) ?? [];
    list.push(sec);
    groupedByPart.set(label, list);
  }

  const totalSnapshots = sections.reduce(
    (sum, s) => sum + s.versions.length + s.quarantinedWatchlist.length,
    0,
  );

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Browse", path: "/explore" },
    { name: "38 C.F.R. Permalink Directory", path: "/explore/cfr-directory" },
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-10">
      <JsonLdScript data={breadcrumbJsonLd} />

      <nav aria-label="Breadcrumb" className="text-xs">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Browse Topics</span>
        </Link>
      </nav>

      <header className="space-y-2 border-b border-border pb-6">
        <p className="font-mono text-xs text-primary">
          {sections.length} Indexed 38 C.F.R. Hubs · {totalSnapshots} Snapshot
          Permalinks · Checked {manifest.checkedAsOf}
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          38 C.F.R. Point-in-Time Permalink Directory
        </h1>
        <p className="editorial-prose text-muted-foreground">
          Direct jump directory to every indexed{" "}
          <code className="font-mono text-xs">38 C.F.R.</code> section hub,
          individual effective-date snapshot permalink, and multi-section
          regulatory comparison module. Proposed, unfinalized, or rescinded
          Federal Register notices are explicitly marked{" "}
          <strong>Quarantined (Not Enacted)</strong>.
        </p>
      </header>

      <div className="space-y-3">
        {Array.from(groupedByPart.entries()).map(([partLabel, partSecs], idx) => (
          <details
            key={partLabel}
            open={idx < 2}
            className="rounded-lg border border-border bg-surface-elevated"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3.5 hover:bg-surface">
              <span className="font-serif text-lg font-bold text-foreground">
                {partLabel}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {partSecs.length} section(s)
              </span>
            </summary>

            <div className="divide-y divide-border border-t border-border px-4">
              {partSecs.map((sec) => (
                <div key={sec.sectionSlug} className="space-y-2 py-3.5 text-xs">
                  <div>
                    <Link
                      href={`/cfr/${sec.sectionSlug}`}
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      {sec.cfrSection}
                    </Link>{" "}
                    <span className="font-medium text-foreground">
                      — {sec.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {sec.versions.map((ver) => (
                      <Link
                        key={ver.version_id}
                        href={ver.permalink}
                        className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
                      >
                        Eff. {ver.effective_from} →{" "}
                        {ver.effective_to ?? "present"}
                      </Link>
                    ))}
                    {sec.quarantinedWatchlist.map((qVer) => (
                      <Link
                        key={qVer.version_id}
                        href={qVer.permalink}
                        className="rounded border border-[var(--status-summary-border)] bg-[var(--status-summary-bg)] px-2.5 py-1 font-mono text-xs text-[var(--status-summary-fg)] hover:underline"
                      >
                        Quarantined (Proposed / Rescinded, Not Enacted):{" "}
                        {qVer.federal_register_citation ??
                          qVer.publication_date ??
                          qVer.effective_from}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}

        <details className="rounded-lg border border-border bg-surface-elevated">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3.5 hover:bg-surface">
            <span className="font-serif text-lg font-bold text-foreground">
              Multi-Section Regulatory Snapshots &amp; Redline Guides
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {cfrModules.length} modules
            </span>
          </summary>
          <div className="border-t border-border p-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {cfrModules.map((mod) => (
                <li key={mod.id}>
                  <Link
                    href={mod.route}
                    className="block rounded border border-border bg-surface px-3 py-2 text-xs text-foreground hover:border-primary hover:text-primary"
                  >
                    {mod.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </main>
  );
}
