"use client";

import { useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Calendar, History } from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import { cn } from "@/lib/utils";
import { LexiconText } from "./lexicon-text";

interface TimelineMilestone {
  id: string;
  year: string;
  isoDate: string;
  shortTitle: string;
  track: "VASRD" | "Statute" | "Part 3" | "Precedent" | "Watchlist";
  veteranNote: string;
  practitionerNote: string;
  href: string;
}

const TIMELINE_MILESTONES: ReadonlyArray<TimelineMilestone> = [
  {
    id: "m-1946",
    year: "1946",
    isoDate: "1954-06-15",
    shortTitle: "1945 VASRD Eff.",
    track: "VASRD",
    veteranNote:
      "Post-WWII rating schedule took effect April 1, 1946, setting baseline rules for gunshot/shrapnel muscle and scar ratings.",
    practitionerNote:
      "1945 Looseleaf VASRD effective April 1, 1946 (republished May 22, 1964 at 29 FR 6718; savings shields in 38 C.F.R. §§ 3.951–3.953).",
    href: "/cfr/38-cfr-4.56/1946-04-01",
  },
  {
    id: "m-1959",
    year: "1959",
    isoDate: "1960-03-10",
    shortTitle: "Title 38 Codified",
    track: "Statute",
    veteranNote:
      "Congress replaced WWII 'Veterans' Regulations' with three- and four-digit Title 38 law numbers (§ 310, § 355, § 3010).",
    practitionerNote:
      "Pub. L. 85-857 effective Jan. 1, 1959; protects Dec. 31, 1957 / Dec. 31, 1958 awards under §§ 10–11 savings clauses (38 C.F.R. § 3.953).",
    href: "/crosswalk",
  },
  {
    id: "m-1963",
    year: "1963",
    isoDate: "1974-08-12",
    shortTitle: "Mandatory SOC Act",
    track: "Statute",
    veteranNote:
      "Starting Jan. 1, 1963, if a Veteran filed a written Notice of Disagreement (NOD) and VA never sent a Statement of the Case (SOC), the appeal stayed open.",
    practitionerNote:
      "Pub. L. 87-666 (eff. Jan. 1, 1963): unissued SOC following a timely NOD prevents Legacy finality from attaching across decades.",
    href: "/docs/procedural-vehicles-piercing-finality",
  },
  {
    id: "m-1988",
    year: "1988",
    isoDate: "1990-05-15",
    shortTitle: "VJRA Court Review",
    track: "Statute",
    veteranNote:
      "Veterans' Judicial Review Act created independent federal court review of Board decisions for the first time.",
    practitionerNote:
      "Pub. L. 100-687 (Nov. 18, 1988): created COVA/CAVC, mandated BVA 'reasons or bases' (§ 7104(d)(1)), and ended former § 211(a) isolation.",
    href: "/crosswalk",
  },
  {
    id: "m-1992",
    year: "1992",
    isoDate: "1994-05-10",
    shortTitle: "Bell Record Rule",
    track: "Precedent",
    veteranNote:
      "From July 21, 1992 forward, VA hospital records that existed when VA decided your claim count as part of your file even if VA hadn't copied them over.",
    practitionerNote:
      "Bell v. Derwinski, 2 Vet. App. 611 (July 21, 1992) & VAOPGCPREC 12-95: prospective constructive VA possession cutoff for CUE.",
    href: "/docs/procedural-vehicles-piercing-finality",
  },
  {
    id: "m-1997",
    year: "1997",
    isoDate: "1997-11-25",
    shortTitle: "§ 4.56 & Board CUE",
    track: "VASRD",
    veteranNote:
      "VA updated muscle-injury rules effective July 3, 1997 (published June 3, 1997), and Congress enacted Board CUE review on November 21, 1997.",
    practitionerNote:
      "62 FR 30235 (pub. 1997-06-03, eff. 1997-07-03) § 4.56(b) T&T floor + Pub. L. 105-111 (eff. 1997-11-21) enacting 38 U.S.C. §§ 5109A & 7111.",
    href: "/cfr/38-cfr-4.56",
  },
  {
    id: "m-2006",
    year: "2006",
    isoDate: "2006-10-06",
    shortTitle: "§ 3.156(c) Service Recs",
    track: "Part 3",
    veteranNote:
      "Clarified that newly located military, inpatient surgical, or declassified unit records reopen old denials with retroactive effective dates.",
    practitionerNote:
      "71 FR 52455 (pub. 2006-09-06, eff. 2006-10-06): codified § 3.156(c)(1)–(4) (paired with Vigil v. Peake for pre-2006 claims).",
    href: "/cfr/38-cfr-3.156c",
  },
  {
    id: "m-2008",
    year: "2008",
    isoDate: "2012-06-01",
    shortTitle: "Scars & TBI Overhaul",
    track: "VASRD",
    veteranNote:
      "Effective Oct. 23, 2008, VA began counting every painful or unstable scar (10%/20%/30%) instead of capping painful scars at 10%.",
    practitionerNote:
      "73 FR 54708 & 73 FR 54693 (eff. Oct. 23, 2008): count-based DC 7804 painful scars and 10-facet DC 8045 TBI evaluation table.",
    href: "/cfr/38-cfr-4.118",
  },
  {
    id: "m-2015",
    year: "2015",
    isoDate: "2015-04-01",
    shortTitle: "Standard Claim Forms",
    track: "Part 3",
    veteranNote:
      "Effective March 24, 2015, VA replaced informal written statements and hospital-report claims with Intent to File (21-0966) and 21-526EZ.",
    practitionerNote:
      "79 FR 57660 (eff. Mar. 24, 2015): prospectively repealed former §§ 3.155(a) & 3.157(b) without extinguishing pre-2015 pending claims (Shea).",
    href: "/reference/forms-and-codes",
  },
  {
    id: "m-2022",
    year: "2022–26",
    isoDate: "2024-07-01",
    shortTitle: "AMA, George & PACT",
    track: "Precedent",
    veteranNote:
      "Modern three-lane AMA system, PACT Act toxic exposure expansions, and Supreme Court George v. McDonough ruling on historical CUE rules.",
    practitionerNote:
      "AMA § 5104(b) explicit-notice rule (Hamill, 2026), George (§ 20.1403(e)), Barry SMC steps (2024), Soto CRSC (2025), & quarantined 90 FR 46542.",
    href: "/docs/procedural-vehicles-piercing-finality",
  },
];

export function FisheyeTimelineRail() {
  const prefersReducedMotion = useReducedMotion();
  const { decisionDate, setDecisionDate } = useResearchContext();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string>("m-1997");

  const selectedMilestone =
    TIMELINE_MILESTONES.find((m) => m.id === selectedId) ?? TIMELINE_MILESTONES[5]!;

  return (
    <section
      aria-labelledby="fisheye-timeline-heading"
      className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2
            id="fisheye-timeline-heading"
            className="inline-flex items-center gap-2 font-serif text-lg font-bold text-foreground"
          >
            <History className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Interactive Veterans Law Chronology Rail (1946–2026)</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Select any watershed milestone to lock the active{" "}
            <strong>Decision Date</strong> across all tracks and point-in-time regulations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-elevated px-2.5 py-1 font-mono text-xs text-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{decisionDate ?? "Current Law"}</span>
          </span>
          {decisionDate && (
            <button
              type="button"
              onClick={() => setDecisionDate(null)}
              className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs font-semibold text-primary hover:bg-muted"
            >
              Reset to Current
            </button>
          )}
        </div>
      </div>

      {/* Accessible Touch/Keyboard Fisheye Milestone Rail */}
      <div
        onMouseLeave={() => setHoveredIdx(null)}
        className="overflow-x-auto pb-1"
      >
        <div
          role="list"
          aria-label="Key Veterans Law chronological milestones"
          className="flex min-w-[680px] items-end justify-between gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-3"
        >
          {TIMELINE_MILESTONES.map((ms, idx) => {
            const dist = hoveredIdx === null ? 99 : Math.abs(hoveredIdx - idx);
            const scale =
              prefersReducedMotion || hoveredIdx === null
                ? 1
                : dist === 0
                  ? 1.12
                  : dist === 1
                    ? 1.05
                    : 1;

            const isSelected =
              selectedMilestone.id === ms.id || decisionDate === ms.isoDate;

            return (
              <div key={ms.id} role="listitem" className="flex-1">
                <button
                  type="button"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() => setHoveredIdx(null)}
                  onClick={() => {
                    setSelectedId(ms.id);
                    setDecisionDate(ms.isoDate);
                  }}
                  style={
                    prefersReducedMotion
                      ? undefined
                      : {
                          transform: `scale(${scale})`,
                          transformOrigin: "bottom center",
                        }
                  }
                  className={cn(
                    "flex w-full flex-col items-center rounded-md border px-1.5 py-2 text-center transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border/80 bg-background text-foreground hover:border-primary/60 hover:bg-surface",
                  )}
                >
                  <span className="font-mono text-xs font-bold">{ms.year}</span>
                  <span
                    className={cn(
                      "mt-0.5 line-clamp-1 text-xs font-medium",
                      isSelected ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {ms.shortTitle}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Milestone Split Detail Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface-elevated p-3.5 text-xs leading-relaxed">
        <div className="max-w-3xl space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs font-bold text-primary">
              {selectedMilestone.year} · {selectedMilestone.track}
            </span>
            <span className="font-semibold text-foreground">
              {selectedMilestone.shortTitle}
            </span>
          </div>
          <p data-persona="veteran-only" className="text-muted-foreground">
            <LexiconText text={selectedMilestone.veteranNote} />
          </p>
          <p data-persona="practitioner-only" className="text-muted-foreground">
            <LexiconText text={selectedMilestone.practitionerNote} />
          </p>
        </div>

        <Link
          href={selectedMilestone.href}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 font-semibold text-primary hover:bg-muted"
        >
          <span>Inspect Authority</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
