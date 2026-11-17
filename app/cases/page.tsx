import type { Metadata } from "next";
import Link from "next/link";
import { CasesDirectoryClient } from "@/components/bitemporal/cases-directory-client";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { getCompiledPrecedents, getCoverageManifest } from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Judicial Precedent & VAOPGCPREC Authority Directory (Era-Filterable)",
  description:
    "Explore U.S. Supreme Court, Federal Circuit, CAVC precedential decisions, and binding vs. withdrawn VA General Counsel Precedent Opinions (VAOPGCPREC), organized by historical adjudication era, authority tier, and practice domain.",
};

export default function CasesDirectoryPage() {
  const manifest = getCoverageManifest();
  const precedents = getCompiledPrecedents();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Court Decisions &amp; VA Legal Opinions Organized by Era
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Era-Filterable Precedent &amp; VAOPGCPREC Authority Directory
        </h1>
        <p
          data-persona="veteran-only"
          className="editorial-prose text-muted-foreground"
        >
          <LexiconText text="Explore the Supreme Court, Federal Circuit, CAVC, and VA General Counsel rulings that govern VA disability and survivor decisions—and select an Era in the top bar to see which rulings apply to a decision from that decade." />
        </p>
        <p
          data-persona="practitioner-only"
          className="editorial-prose text-muted-foreground"
        >
          Controlling SCOTUS, Federal Circuit, CAVC precedential opinions,{" "}
          <Link
            href="/docs/vaopgcprec-index"
            className="text-primary underline underline-offset-2"
          >
            binding &amp; quarantined VAOPGCPREC digests
          </Link>
          , and CAVC Rule 30(a) nonprecedential guardrails ({precedents.length}{" "}
          deduplicated authorities;{" "}
          <Link
            href="/docs/authority-verification-log"
            className="text-primary underline underline-offset-2"
          >
            Authority Hierarchy &amp; Verification Log
          </Link>
          ). Treatment checked as of{" "}
          <span className="font-mono">{manifest.checkedAsOf}</span>.
        </p>
      </header>

      <CasesDirectoryClient
        precedents={precedents}
        checkedAsOf={manifest.checkedAsOf}
        totalModules={manifest.totals.upstreamModules}
      />
    </main>
  );
}
