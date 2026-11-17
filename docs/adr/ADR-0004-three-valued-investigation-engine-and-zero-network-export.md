# ADR-0004: Three-Valued Investigation Engine, Bitemporal Pathway Ordering & Zero-Network Export Contract

- **Status:** Approved (`2026-11-16`)
- **Governs:** `EPIC 4` (`lib/screener/`, `components/investigate/`, `app/investigate/page.tsx`, `tests/unit/screener-three-valued.test.ts`, `tests/e2e/privacy-network-silence.spec.ts`)
- **Upstream Schema & Doctrine:** `corpus/upstream/schemas/case-screen.schema.json`, `playbooks/01-penetrating-wounds-scars-vs-muscles.md`, `docs/procedural-vehicles-piercing-finality.md`, `checklists/board-cue-pre-filing-gate.md`

---

## 1. Context & Problem Statement

Conventional online Veterans Law intake forms commit three recurring errors:
1. **Binary False-Negative Trap (`Unknown -> No`):** Treating missing C-file or NPRC facts as `"No"`, prematurely hiding `38 C.F.R. § 3.156(c)` reconsiderations, unissued Legacy Statements of the Case (`Tablazon`), post-decision `§ 3.156(b)` VAMC records (`Lang`), or pre-March 24, 2015 `§ 3.157(b)` hospital-report claims before the claimant obtains the underlying file.
2. **Premature Board CUE Risk (`§ 20.1409(c)`):** Steering users directly into collateral Clear and Unmistakable Error (`CUE`) motions without first exhausting open-record vehicles (`§ 3.156(c)` overrides Board finality under `§ 20.1411(b)` without consuming `§ 20.1409(c)`), verifying `38 C.F.R. § 20.1104` Board subsumption, checking `July 21, 1992` *Bell* record scope, or separating Federal Register **Publication Dates** from **Effective Dates**.
3. **Telemetry & URL Leakage:** Serializing sensitive disability and procedural facts into shareable URL query strings (`?dc=...&answers=...`) or firing third-party analytics calls.

---

## 2. Decisions

### Decision 1: Strict Three-Valued Pathway Preservation (`"yes" | "no" | "unknown"`)
- Every factual precondition in `lib/screener/` evaluates over `TriValue = "yes" | "no" | "unknown"`.
- `"unknown"` (*"I'm Not Sure"* in Veteran Mode / *"Unknown"* in Practitioner Mode) **never** evaluates as `"no"` or drops a candidate pathway. Instead, any `"unknown"` precondition without an explicit disqualifying answer keeps the pathway active in `"unresolved-records-needed"` and deduplicates its evidentiary target into a prioritized **"Records to Locate & Why"** checklist (`FOIA C-File / Rating Code Sheet`, `NPRC SF 180 Inpatient Surgical Packet`, `VACOLS / BVA Docket Audit`, etc.).

### Decision 2: Non-CUE-First Bitemporal Hierarchy & Point-in-Time `T₀` Coupling
- Candidate pathways are ranked in protective doctrinal order:
  1. **Open-Record Reconsideration (`38 C.F.R. § 3.156(c)`)** and **Unadjudicated / Non-Final Claim Streams** (`Tablazon` NOD without SOC, pre-2015 `§§ 3.155(a) / 3.157(b)` informal/hospital claims, `§ 3.156(b)` *Beraud*/*Lang* 1-year VAMC records, defective mailing notice, and post-Feb. 19, 2019 AMA `§ 5104(b)` omitted issues under *Hamill v. Collins*, 166 F.4th 1030 (Fed. Cir. 2026));
  2. **Substantive Multi-Manifestation Audit (`§ 4.56` Muscle Group vs. `§ 4.118` Scar under `§ 4.14` / *Esteban v. Brown*)**, coupled directly to `resolveCfrAtDate` on `decisionDate` (`T₀`) so Federal Register publication-gap traps (`1997-06-20` -> `1946-04-01` `§ 4.56`), pre-baseline corpus gaps (`Do Not Rely`), and quarantined proposals (`90 FR 46542`) surface inline;
  3. **Unsubsumed Regional Office CUE (`38 U.S.C. § 5109A`; `38 C.F.R. § 3.105(a)`)**, gated on `bvaMeritsSubsumed !== "yes"`, *Bell* (`1992-07-21`) record scope, and `§ 4.25` combined-payment math;
  4. **Board CUE (`38 U.S.C. § 7111`; `38 C.F.R. §§ 20.1400–20.1411`)**, gated on `priorBvaCueDecidedOnMerits !== "yes"` (`§ 20.1409(c)` single final merits decision per prior Board decision on an issue, excluding without-prejudice pleading dismissals under `§ 20.1404`), `§ 20.1403(d)–(e)` (*Cook* & *George v. McDonough*) exclusions, and `/checklists/board-cue-pre-filing-gate`;
  5. **Prospective Supplemental / Increase Baseline (`38 U.S.C. § 5108`; `38 C.F.R. § 3.2501`)** plus cross-system **Title 10 DoD/DFAS `CRSC` (`10 U.S.C. § 1413a`)** screening under *Soto v. United States*, 605 U.S. 360 (2025) (explicitly distinguished from Title 38 VA claims).

### Decision 3: Pure Client Memory & Dual UPL-Safe Corpus-Stamped Exports
- `lib/screener/` remains 100% pure TypeScript (zero React, Next.js, or `node:fs` imports).
- Screening state lives exclusively in ephemeral React component memory: zero `window.location.search`/`hash` serialization, zero `localStorage`/`sessionStorage` persistence of screening answers, and zero `fetch`/`XHR`/`sendBeacon` requests (verified end-to-end by `tests/e2e/privacy-network-silence.spec.ts`).
- `lib/screener/export-packet.ts` generates two distinct outputs stamped with `corpusReleaseId` and `checkedAsOf` from `corpus/manifest.lock.json`:
  - **Veteran Mode:** Educational **Representative Discussion & Records Sheet** (records to request + non-directive questions for an accredited VSO, claims agent, or attorney).
  - **Practitioner Mode:** Structured **Pre-Filing C-File Audit & Gate Packet** (`Why Triggered`, `Kill Switches`, `T₀` permalinks, and Subpart O pre-filing verification gates).
