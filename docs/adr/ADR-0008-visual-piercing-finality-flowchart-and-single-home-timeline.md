# ADR-0008: Dedicated Piercing-Finality Flowchart Route, Semantic Map Edges & Single-Home `/timeline` Chronology

- **Status:** Approved (`2026-11-17`)
- **Extends:** [ADR-0001](ADR-0001-corpus-decomposition-and-pinned-sync-boundary.md), [ADR-0006](ADR-0006-sticky-era-timeline-and-bitemporal-authority-directory.md), [ADR-0007](ADR-0007-compact-mobile-era-chip-and-task-navigation.md)
- **Governs:** `lib/corpus/piercing-finality-flowchart.ts`, `lib/corpus/knowledge-tree.ts`, `lib/corpus/timeline.ts`, `components/bitemporal/piercing-finality-flowchart.tsx`, `components/bitemporal/osint-knowledge-tree.tsx`, `components/bitemporal/multi-track-timeline.tsx`, `app/explore/piercing-finality/page.tsx`, `app/timeline/page.tsx`, `app/eras/page.tsx`, `components/chrome/site-header.tsx`

---

## 1. Context

1. **Single-Job `/explore` Landing vs. Dedicated Visual Decision Flowchart (`E6-S1`):** Under `EPIC 11` and [ui-ux-simplification-recommendations.md](../ux/ui-ux-simplification-recommendations.md) § 5, `/explore` defaults to a clean, searchable 5-branch **Directory** with **Map** as its secondary toggle. Embedding a full 6-gate SVG decision flowchart directly onto `/explore` would re-introduce stacked widgets on a browse gateway.
2. **Semantic Relationship Legibility & 1:1 Directory/Map Parity (`E6-S2`):** Visitors switching `/explore` from **Directory** to **Map** need concise `<= 4`-word top-level labels, `Decision Date`-reactive era branching, and explicit semantic relationship labels (*amends*, *interprets*, *pierces finality*, *limits*) mirrored across both views.
3. **Single Canonical Home for Chronological Visualization (`E6-S3`):** During `E10-S4`, `<FisheyeTimelineRail />` was temporarily relocated from `/` to `/eras` while `/timeline` remained unbuilt. Keeping interactive chronology widgets split across `/eras` and `/timeline` duplicates navigation intent.
4. **Strict Rulemaking Quarantine on `/timeline`:** `corpus/upstream/docs/master-chronological-matrix.md` and `cfr-amendments.json` track both enacted historical law (`1945–2026`) and seven unfinalized or rescinded rulemaking actions (`RIN 2900-AQ72`, `RIN 2900-AQ73`, `RIN 2900-AQ82`, `RIN 2900-AR96`, `RIN 2900-AS39`, `90 FR 46542`, `91 FR 7118`). Mixing nonbinding proposals into enacted tracks risks temporal or CUE mis-citation.

---

## 2. Decisions

### Decision 1: Dedicated Static `/explore/piercing-finality` Route with Synchronized 1:1 Accessible Outline
- Publish the hand-laid-out SVG **Piercing-Finality Decision Flowchart** at `/explore/piercing-finality` (`app/explore/piercing-finality/page.tsx`), featured as an interactive `Tool` inside `Browse -> Older decisions and review options` (`lib/corpus/knowledge-tree.ts`) and `⌘K` search (`lib/corpus/search-engine.ts`), keeping `/explore`'s default Directory landing focused on browsing.
- Enforce doctrinal gate ordering in pure TypeScript (`lib/corpus/piercing-finality-flowchart.ts`) so non-CUE open/reconsideration/void vehicles are audited **before** collateral CUE, and Regional Office CUE is evaluated **before** one-shot Board CUE:
  1. **Void Rating Reduction / Severance** (`38 C.F.R. §§ 3.344, 3.105(d)–(e), (i), 3.951, 3.957` — *Brown v. Brown*; *Stern*)
  2. **Newly Associated Service Department Records** (`38 C.F.R. § 3.156(c)(1)–(4)` — *Vigil*; *Emerson*; *Blubaugh*/*Kisor* limits)
  3. **Unadjudicated, Defective-Notice, Legacy `§ 3.156(b)` (*Beraud*/*Lang*), or AMA `§ 5104(b)` (*Hamill*) Open Claim**
  4. ***Nehmer* Herbicide Class Stipulation** (`38 C.F.R. § 3.816`)
  5. **Regional Office / AOJ CUE** (`38 U.S.C. § 5109A`; `38 C.F.R. § 3.105(a)` — *Russell*/*Fugo*; *Bell* July 21, 1992 cutoff; *George* bar)
  6. **Board of Veterans' Appeals CUE** (`38 U.S.C. § 7111`; `38 C.F.R. §§ 20.1400–20.1411`, including exact `§ 20.1409(c)` one-final-merits-decision finality per Board issue)
- Pair the interactive SVG flowchart with a synchronized **1:1 Accessible Outline** exposing identical step numbers, Yes/No branches, date-reactive boundary alerts, kill-switches, and dual-persona explanations for keyboard, screen-reader, and `400%` zoom (`320px`) users.

### Decision 2: Typed Semantic Edge Labels & Era Branching in `lib/corpus/knowledge-tree.ts`
- Enrich `KnowledgeTreeNode` with typed semantic relationship labels (`amends`, `interprets`, `pierces finality`, `limits`) and `Decision Date`-driven era rule nodes while keeping top-two-level `shortLabel` values strictly `<= 4` words and tree topology identical across `Veterans` and `Practitioners` modes.
- Render high-contrast (`>= 13px`) semantic edge pills in **Map** mode and corresponding relationship badges in **Directory** rows and the Map Inspector Drawer to preserve 1:1 parity.

### Decision 3: Single-Home 4-Track `/timeline` + Quarantined Watchlist Toggle
- Build `/timeline` (`app/timeline/page.tsx`) as the single canonical home for interactive timeline visualization—mounting `<FisheyeTimelineRail />` alongside `<MultiTrackTimeline />` and retiring `<FisheyeTimelineRail />` from `/eras` (`app/eras/page.tsx` remains the 5-Era Definitions & Side-by-Side Statutory Matrix reference).
- Compile `/timeline` deterministically (`lib/corpus/timeline.ts`) from `docs/master-chronological-matrix.md` and `cfr-amendments.json` into **4 enacted tracks** (`Statutes`, `Part 3 Adjudication`, `Part 4 VASRD`, `Landmark Precedents`) with structured **Retroactive Opportunity vs. Temporal Trap** split cards and Federal Register publication-vs-effective date callouts.
- Isolate all seven non-enacted or rescinded items (`RIN 2900-AQ72`, `RIN 2900-AQ73`, `RIN 2900-AQ82`, `RIN 2900-AR96`, `RIN 2900-AS39`, `90 FR 46542`, `91 FR 7118`) inside a dedicated, toggleable **Quarantined Proposals & Rescinded Rules Watchlist** styled with `.quarantine-stripe` and explicit non-enacted/rescinded warnings.
