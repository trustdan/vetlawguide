import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";
import {
  buildBreadcrumbJsonLd,
  buildDefinedTermSetJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Diagnostic Code Jump Directory (DC 5000–9918) — VASRD 38 C.F.R. Part 4",
  description:
    "Complete Diagnostic Code jump directory across all 15 VASRD body systems (DC 5000–9918) and Subpart A general rating policy, linking directly to 38 C.F.R. snapshots and guides.",
  canonicalPath: "/explore/diagnostic-codes",
  ogEyebrow: "Browse · Diagnostic Code Directory",
  ogCite: "DC 5000–9918 · 38 C.F.R. Part 4",
});

export default function DiagnosticCodeDirectoryPage() {
  const manifest = getCoverageManifest();
  const cfrSections = getCompiledCfrSections();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Browse", path: "/explore" },
    { name: "Diagnostic Code Directory", path: "/explore/diagnostic-codes" },
  ]);

  const termSetJsonLd = buildDefinedTermSetJsonLd({
    name: "U.S. VA Schedule for Rating Disabilities (VASRD) Diagnostic Code Directory",
    description:
      "38 C.F.R. Part 4 body-system schedules and Diagnostic Code ranges (DC 5000–9918).",
    canonicalPath: "/explore/diagnostic-codes",
    terms: manifest.vasrdSystems.map((sys) => ({
      termCode: sys.diagnosticCodeRange,
      name: sys.label,
      description: `38 C.F.R. Part 4 rating schedule (${sys.diagnosticCodeRange})`,
    })),
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-10">
      <JsonLdScript data={breadcrumbJsonLd} />
      <JsonLdScript data={termSetJsonLd} />

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
          38 C.F.R. Part 4 · DC 5000–9918 · Checked {manifest.checkedAsOf}
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          VASRD Diagnostic Code Jump Directory (DC 5000–9918)
        </h1>
        <p className="editorial-prose text-muted-foreground">
          Direct index of all {manifest.vasrdSystems.length} VA rating-schedule
          hubs, Diagnostic Code ranges, point-in-time{" "}
          <code className="font-mono text-xs">38 C.F.R.</code> section chains,
          and historical rating-criteria guides. For hyphenated{" "}
          <code className="font-mono text-xs">xx99-xxxx</code> analogous codes,
          open the{" "}
          <Link
            href="/reference/forms-and-codes"
            className="font-medium text-primary underline underline-offset-2"
          >
            Forms &amp; Analogous Code Decoder
          </Link>
          .
        </p>
      </header>

      <div className="space-y-3">
        {manifest.vasrdSystems.map((sys, idx) => {
          const sysModules = manifest.modules.filter(
            (m) => m.vasrdSystem === sys.systemId,
          );
          const sysSections = cfrSections.filter(
            (s) => s.vasrdSystem === sys.systemId,
          );
          const allCodes = Array.from(
            new Set([
              ...sysModules.flatMap((m) => m.diagnosticCodes),
              ...sysSections.flatMap((s) => s.diagnosticCodes),
            ]),
          );

          return (
            <details
              key={sys.systemId}
              open={idx < 2}
              className="group rounded-lg border border-border bg-surface-elevated"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3.5 hover:bg-surface">
                <div className="space-y-0.5">
                  <span className="font-serif text-lg font-bold text-foreground">
                    {sys.label}
                  </span>
                  <span className="ml-2.5 font-mono text-xs text-primary">
                    {sys.diagnosticCodeRange}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {sysModules.length} guides · {sysSections.length} CFR chains
                </span>
              </summary>

              <div className="space-y-4 border-t border-border px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/vasrd/${sys.systemId}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <span>Open {sys.label} Rating Hub</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  {allCodes.length > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      Codes: {allCodes.slice(0, 12).join(", ")}
                    </span>
                  )}
                </div>

                {sysSections.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Point-in-Time 38 C.F.R. Sections
                    </h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {sysSections.map((sec) => (
                        <li key={sec.sectionSlug}>
                          <Link
                            href={`/cfr/${sec.sectionSlug}`}
                            className="block rounded border border-border bg-surface px-3 py-2 text-xs hover:border-primary"
                          >
                            <span className="font-mono font-semibold text-primary">
                              {sec.cfrSection}
                            </span>{" "}
                            — <span className="text-foreground">{sec.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sysModules.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Primary-Source Snapshots &amp; Redline Guides
                    </h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {sysModules.map((mod) => (
                        <li key={mod.id}>
                          <Link
                            href={mod.canonicalRoute}
                            className="block rounded border border-border bg-surface px-3 py-2 text-xs text-foreground hover:border-primary hover:text-primary"
                          >
                            {mod.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}
