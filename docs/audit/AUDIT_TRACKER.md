# VetLawGuide — Master Concurrent Audit Tracker (`AUDIT_TRACKER.md`)

See [concurrent-audit-plan.md](concurrent-audit-plan.md) for lane ownership and finding ID rules (`AUD-CL-*`, `AUD-CX-*`, `AUD-AG-*`).

---

## Baseline Status (`E7-S3` Milestone Audit — Completed `2026-11-17`)

- **Audited Milestone:** `EPIC 0`–`EPIC 7` + `EPIC 10`–`EPIC 12` (`47 / 57` slices complete; `388` static SSG pages)
- **Audited Base Commit (`HEAD`):** `353b017` (+ `EPIC 5–12` worktree state)
- **Pinned Corpus Snapshot:** `corpus-w5-2026-11-17-e6d900e3` (`111 / 111` `VA-law-planning` modules, `174` CFR snapshots across `75` sections, `16` VASRD hubs, `437` precedents/OGC opinions, `73` crosswalk rows, `59` lexicon entries, `111 / 111` SHA-256-locked Veteran overlays)
- **Audit Execution Topology:** Three concurrent, strictly isolated read-only specialist lanes executed in parallel against the live worktree and `http://localhost:3124` production build (`AUD-CL-*` Legal/UPL/Harness-Claims lens, `AUD-CX-*` Pragmatic/Compiler/Screener/Security lens, and `AUD-AG-*` Headless Playwright Chromium + `@axe-core/playwright` live reflow/a11y lens; note external `claude`/`codex` CLIs and desktop Chrome `DevToolsActivePort` were inactive on host, so all three lanes executed via isolated unprimed specialist/Chromium verifiers).
- **Remediation Summary:** `10` total findings (`2 × P1`, `4 × P2`, `4 × P3`) surfaced across the three concurrent passes — **`10 / 10` remediated and `VERIFIED_FIXED`** with automated Vitest, QA script, and Playwright E2E regression gates (`0` open `P0`–`P3` defects).

---

## 1. Claude Lane (`AUD-CL-*`: Bitemporal Legal Accuracy, UPL/Plain-English & Governance Truth)

- **Status:** `COMPLETED_ALL_VERIFIED_FIXED` (`2026-11-17`)
- **Verified Invariants:**
  - `BACKLOG.md` <-> `PLAN.md` <-> `coverage-manifest.json` lockstep (`111/111` modules & SHA-256 overlays, `0` held-at-gate placeholders, `ADR-0001`..`ADR-0008` unbroken).
  - Zero public build vocabulary (`Bookmark`, `Tracer Bullet`, `Wave`, `d3-hierarchy`, `3-Column`) across `/`, `/explore`, `/playbooks`, `/cases`, `/timeline`, and `<SiteHeader />`; UPL-safe educational framing and `<CrossInspectionExpander />` parity verified.
  - Exact FR publication-vs-effective date separation, `38 C.F.R. § 20.1409(c)` Board CUE merits finality, `George v. McDonough` / `§ 20.1403(e)` collateral bars, `CAVC Rule 30(a)` / `Fed. Cir. R. 32.1` nonprecedential warnings, and 7-item `RIN` / `90 FR 46542` / `91 FR 7118` quarantine verified.

### Findings (`AUD-CL-*`)

#### `AUD-CL-001` — Stale `Wave 1` Quickstart Comment & Legacy `~84px` Header Claims in Governance Docs
- **Severity:** `P2`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `README.md:26`, `AGENTS.md:90,95`, `docs/audit/concurrent-audit-plan.md:13`
- **Trigger & Expected vs. Actual:** Comparing governance docs against `coverage-manifest.json` (`activeBookmarkWave: "W5"`) and `ADR-0007` showed a leftover `Wave 1 Live vs. Waves 2-5 Placeholders` quickstart comment in `README.md` and `~84px` 2-tier header descriptions in `AGENTS.md` / `concurrent-audit-plan.md` instead of `ADR-0007`'s `<= 144px` desktop / `<= 120px` mobile / `>= 50%` `400%`-zoom content budget.
- **Resolution & Regression Gate:** Updated `README.md`, `AGENTS.md`, and `concurrent-audit-plan.md`; codified automated drift assertions in `scripts/historian_audit.ts` (`pnpm qa:historian`).

#### `AUD-CL-002` — Stale Crosswalk & Lexicon Counts in `BACKLOG.md` Horizon 3 (`E8-S1`)
- **Severity:** `P3`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `BACKLOG.md:103`
- **Trigger & Expected vs. Actual:** `E8-S1` listed `Wave 1`-era `"72+ statutory crosswalk rows, 40 lexicon items"` whereas compiled `Wave 5` `coverage-manifest.json` contains `73` crosswalk rows and `59` lexicon entries.
- **Resolution & Regression Gate:** Updated `BACKLOG.md:103` to `73` statutory crosswalk rows and `59` lexicon items (`pnpm qa:historian`).

#### `AUD-CL-003` — Plain-English Veteran Labels & `<LexiconText />` Tooltips on `/cases` Compact Row Badges
- **Severity:** `P3`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `components/bitemporal/cases-directory-client.tsx:56-77, 152-198`
- **Trigger & Expected vs. Actual:** In `Veterans` mode on `/cases`, collapsed `CompactAuthorityRow` badges rendered practitioner shorthand (`"VAOPGCPREC · Binding OGC"`) and unwrapped guardrail text without `<LexiconText />`.
- **Resolution & Regression Gate:** Added `VETERAN_TIER_BADGE_LABELS` (`"VA General Counsel Opinion (Binding)"`, `"Single-Judge Memo (Not Binding — Rule 30(a))"`, etc.) for `audienceMode === "veteran"` and wrapped inline guardrail notices in `<LexiconText />`.

---

## 2. Codex Lane (`AUD-CX-*`: Pragmatic Orthogonality, Compiler, Screener & Security)

- **Status:** `COMPLETED_ALL_VERIFIED_FIXED` (`2026-11-17`)
- **Verified Invariants:**
  - Strict `pnpm@12.4.1` & `tsc --noEmit` hygiene; zero `@xyflow/react` / `three` bloat; zero `react`/`next` imports in pure `lib/` domain engines; zero `node:*` imports in browser-bundled modules (`lib/screener/*`, `lib/corpus/timeline.ts`, `lib/corpus/knowledge-tree.ts`, `lib/corpus/piercing-finality-flowchart.ts`).
  - Honest `CORPUS_GAP_OR_QUEUED_WAVE` (`doNotRely: true`) pre-baseline CFR handling, strict `effective_from <= decisionDate <= effective_to` resolution, and three-valued (`"unknown" != "no"`) `/investigate` screening logic elevating missing records without dropping candidate pathways.
  - Progressive disclosure verified across `/cases` (`25/page` keyed pagination + expandable holdings), `/investigate` (4-stage browser-memory wizard + 3-block summary), and `<ThreeColumnReader />` (`lg:col-span-8` primary column + collapsible mobile `<details>` TOC).

### Findings (`AUD-CX-*`)

#### `AUD-CX-001` — Clearing `<input type="date">` in `/investigate` Threw Unhandled Render Error on Empty String
- **Severity:** `P1`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `components/investigate/investigation-workspace.tsx:323-335, 415-424, 654-671`
- **Trigger & Expected vs. Actual:** Clearing `#investigate-decision-date` (`e.target.value === ""`) wrote `decisionDate: ""` directly into `intake`, triggering `throw new Error("Invalid ISO date")` inside `resolveCfrAtDate` / `buildBitemporalTwoPaneContext` on re-render and unmounting in-memory screening state.
- **Resolution & Regression Gate:** Separated `draftDecisionDate` input state from committed `intake.decisionDate` (retaining the prior valid `YYYY-MM-DD` date while surfacing an inline `role="status"` prompt when blank/incomplete); added Playwright E2E regression assertion in `tests/e2e/privacy-network-silence.spec.ts`.

#### `AUD-CX-002` — Subpart O Board CUE Slug Divergence in `lib/corpus/` (`/cfr/38-cfr-20.1403-20.1409` vs. `/cfr/38-cfr-20.1400-20.1411`)
- **Severity:** `P2`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `lib/corpus/knowledge-tree.ts:1023`, `lib/corpus/timeline.ts:266,659`, `lib/corpus/piercing-finality-flowchart.ts:358`, `scripts/qa_ux_upl_audit.ts:353`
- **Trigger & Expected vs. Actual:** `knowledge-tree.ts`, `timeline.ts`, and `piercing-finality-flowchart.ts` linked to `/cfr/38-cfr-20.1403-20.1409` whereas compiled `cfr-sections.json` and `temporal.ts:221` emit canonical slug `/cfr/38-cfr-20.1400-20.1411`, escaping `qa_ux_upl_audit.ts` because `lib/` was excluded from route scanning.
- **Resolution & Regression Gate:** Aligned all Subpart O links to `/cfr/38-cfr-20.1400-20.1411` and expanded `scripts/qa_ux_upl_audit.ts` check `4b` to scan `["app", "components", "content", "lib"]` against `validInternalRoutes` (`pnpm qa:upl`).

#### `AUD-CX-003` — Verify Static Route Generation for Quarantined `90 FR 46542` Permalink Across `lib/`
- **Severity:** `P2`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `lib/corpus/knowledge-tree.ts:437`, `lib/corpus/timeline.ts:843`, `scripts/qa_ux_upl_audit.ts:296-298, 353`
- **Trigger & Expected vs. Actual:** Flagged potential static-param mismatch on `/cfr/38-cfr-4.118/2025-09-29` if `quarantinedWatchlist` permalinks were ever omitted from SSG or `lib/` link checks.
- **Resolution & Regression Gate:** Confirmed `/cfr/38-cfr-4.118/2025-09-29` is statically generated via `sec.quarantinedWatchlist` (`tests/e2e/a11y-reflow-motion.spec.ts:244`) and permanently locked `lib/` `href` verification into `scripts/qa_ux_upl_audit.ts` (`pnpm qa:upl`).

#### `AUD-CX-004` — Add Browser-Enforced `Content-Security-Policy` (`connect-src 'self'`) on `/investigate` & Global `Permissions-Policy`
- **Severity:** `P3`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `next.config.ts:6-41`, `tests/e2e/privacy-network-silence.spec.ts:60-65`
- **Trigger & Expected vs. Actual:** `next.config.ts` set `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options`, but omitted `Permissions-Policy` and a browser-enforced `Content-Security-Policy` (`connect-src 'self'`) backing `/investigate`'s zero-egress guarantee.
- **Resolution & Regression Gate:** Added `Permissions-Policy: camera=(), microphone=(), geolocation=()` globally and `Content-Security-Policy` (`connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`) on `/investigate` in `next.config.ts`, verified via HTTP header assertions in `tests/e2e/privacy-network-silence.spec.ts`.

---

## 3. Antigravity Lane (`AUD-AG-*`: Live Chromium Measurements, `WCAG 2.2 AA+`, High-Zoom Reflow & Motion)

- **Status:** `COMPLETED_ALL_VERIFIED_FIXED` (`2026-11-17`)

### Measured Viewport, Header Budget & Reflow Matrix (`http://localhost:3124`)

| Route | `1280×800` Sticky Header (`<=144px`) | `390×844` Mobile Header (`<=120px`) | `320×640` (`400%` Zoom) Header (`<=320px`) | `320×640` Usable Content Height (`>=50%`) | `320×640` `scrollW / clientW` | `axe-core` WCAG 2.2 AA (`Vet`/`Prac` × `Light`/`Dark`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` | `115.00px` | `89.00px` | `128.50px` (`164.50px` w/ active era) | `79.9%` (`511.5px`) | `320 / 320` | `0` violations |
| `/explore` | `126.25px` | `89.00px` | `128.50px` | `79.9%` (`511.5px`) | `320 / 320` | `0` violations |
| `/explore/piercing-finality` | `126.25px` | `89.00px` | `128.50px` | `79.9%` (`511.5px`) | `320 / 320` | `0` violations |
| `/timeline` | `126.25px` | `89.00px` | `128.50px` | `79.9%` (`511.5px`) | `320 / 320` | `0` violations (post-`AUD-AG-001` fix) |
| `/cases` | `126.25px` | `89.00px` | `128.50px` | `79.9%` (`511.5px`) | `320 / 320` | `0` violations |
| `/playbooks` | `115.00px` | `89.00px` | `128.50px` | `79.9%` (`511.5px`) | `320 / 320` | `0` violations |
| `/investigate` | `115.00px` | `89.00px` | `128.50px` | `79.9%` (`511.5px`) | `320 / 320` | `0` violations (`0` post-load network calls) |

- **Additional Live Checks Passed:** Home `<main>` = `139` words (`<= 250`); all 4 home gateways above `800px` fold (`bottom = 501.47px` & `670.72px`); identical primary nav order (`Browse · Ratings · Investigate · Law · Guides · Reference`); dark-mode background = `rgb(23, 24, 26)`; `<GitHubCorner />` upper-right hit (`true`) + lower-left pass-through (`true`); `prefers-reduced-motion: reduce` disables `.octo-arm` wave & fisheye scaling.

### Findings (`AUD-AG-*`)

#### `AUD-AG-001` — Unmounted `aria-controls` Target on Collapsed `/timeline` Watchlist Toggle Failed `axe-core` (`aria-valid-attr-value`)
- **Severity:** `P1`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `components/bitemporal/multi-track-timeline.tsx:322-335`, `tests/e2e/a11y-reflow-motion.spec.ts:746-753`
- **Trigger & Expected vs. Actual:** Before opening `Quarantined Watchlist (7)` on `/timeline`, `[data-testid="toggle-quarantined-watchlist"]` set `aria-pressed="false"` alongside `aria-controls="quarantined-rulemaking-watchlist"` while `#quarantined-rulemaking-watchlist` was unmounted, triggering `axe-core` `aria-valid-attr-value` (WCAG 2.2 A `4.1.2`).
- **Resolution & Regression Gate:** Replaced `aria-pressed` with `aria-expanded={effectiveWatchlistOpen}` and gated `aria-controls` on `effectiveWatchlistOpen`; added a pre-toggle `AxeBuilder` WCAG 2.2 AA scan in `tests/e2e/a11y-reflow-motion.spec.ts` while watchlist count is `0`.

#### `AUD-AG-002` — Explicit SVG Keyboard `Tab` Focus Indicators on `/explore/piercing-finality` & `/explore` Map Nodes
- **Severity:** `P2`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `components/bitemporal/piercing-finality-flowchart.tsx:59-62, 281-287, 342-355`, `components/bitemporal/osint-knowledge-tree.tsx:344-345, 854-882`
- **Trigger & Expected vs. Actual:** SVG `<g role="button" tabIndex={0}>` nodes used `focus:outline-none` without a separate focused SVG halo, leaving keyboard `Tab` focus visually indistinguishable on unselected nodes (WCAG 2.2 AA `2.4.7`).
- **Resolution & Regression Gate:** Added `focusedGateId` / `focusedNodeId` state (`onFocus` / `onBlur`) rendering high-contrast dashed `var(--primary)` SVG focus rings (`flowchart-focus-ring-*` and `map-focus-ring-*`), asserted via keyboard `Tab` tests in `tests/e2e/a11y-reflow-motion.spec.ts`.

#### `AUD-AG-003` — `aria-live="polite"` & Focus-Outline Parity on `/explore` Map Inspector Drawer and `/timeline` Split Card
- **Severity:** `P3`
- **Status:** `VERIFIED_FIXED`
- **HEAD SHA:** `353b017`
- **Location:** `components/bitemporal/osint-knowledge-tree.tsx:921-955`, `components/bitemporal/multi-track-timeline.tsx:90-94`
- **Trigger & Expected vs. Actual:** Activating a Map node or `/timeline` milestone updated the inspector/split card without `aria-live="polite"`, and `Open Reference Page` omitted `focus-visible:outline-2 focus-visible:outline-primary`.
- **Resolution & Regression Gate:** Added `aria-live="polite"` to both regions and `focus-visible:outline-2 focus-visible:outline-primary` to `Open Reference Page`.
