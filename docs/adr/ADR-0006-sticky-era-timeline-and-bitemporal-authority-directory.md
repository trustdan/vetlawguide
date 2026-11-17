# ADR-0006: Persistent Sticky Era-Timeline Chrome, Comprehensive Era Definitions Hub & Bitemporal Era-Reactive Authority Directory

- **Status:** Approved (`2026-11-16`)
- **Supersedes / Extends:** Amends global header chrome budget in [vision.md](../../vision.md) § 2 and [04-calm-craft-and-accessibility.md](../../.agents/rules/04-calm-craft-and-accessibility.md) § 1; pulls forward and expands `EPIC 7` (`E7-S1`–`E7-S2`) alongside `E5-S2`
- **Governs:** `components/chrome/site-header.tsx`, `components/chrome/sticky-era-timeline-bar.tsx`, `components/providers/research-context.tsx`, `lib/corpus/eras-and-authorities.ts`, `app/eras/page.tsx`, `app/cases/page.tsx`, `content/overlays/veteran/era-*.json`

---

## 1. Context

1. **Prominent Chronological Orientation Across Every Route:** While `EPIC 1` collapsed historical date selection into a small `Decision Date` popover button to hold global chrome near `~84px`, in practice Veterans Law research is fundamentally chronological. Users reading `/cfr`, `/cases`, `/playbooks`, `/vasrd`, or `/eras` benefit from a prominent, `WK-private-demo`-inspired **Sticky Era & Timeline Ribbon** pinned inside the sticky top header so chronological context scrolls with every page and switches with a single click.
2. **Need for a Unified Era Definitions & Documentation Reference:** `E5-S1` unlocked all five upstream `eras/*.md` modules (`1945–1961`, `1962–1988`, `1988–2000`, `2000–2018`, `2019–Present`), yet `/eras` initially rendered only a minimal list of five link cards without side-by-side statutory/procedural definitions, watershed boundary explanations, era-specific glossary definitions, or plain-English Veteran overlays.
3. **The Bitemporal Case-to-Era Mapping Problem on `/cases`:**
   - Federal judicial review of VA benefit decisions did not exist before **November 18, 1988 (`Pub. L. 100-687`, VJRA)**, and binding `VAOPGCPREC` opinions began in **1989** (`VAOPGCPREC 5-89`). Filtering `/cases` naively by *opinion issuance year* would return **zero** judicial or `VAOPGCPREC` authorities when a user selects `1945–1961` or `1962–1988`—even though post-1988 opinions (*Russell*, *Esteban*, *Tablazon*, *Brown*, *Vigil*, *George*, `VAOPGCPREC 12-95`) govern investigations of decisions from those exact eras.
   - Conversely, forcing every one of the ~`300+` cited cases across `111` modules into a single "adjudication era" without distinguishing **era-bounded doctrines** (e.g., *Hamill* `>= Feb. 19, 2019` AMA only; *Shea* `< Mar. 24, 2015` informal claims; *Bell* `>= July 21, 1992` constructive possession) from **cross-era foundational doctrines** (*Gilbert* equipoise, *Caluza*/*Shedden* nexus elements, *Walker* `§ 3.309(a)`) would invent false precision.

---

## 2. Decisions

### Decision 1: Three-Tier Sticky Global Chrome (`~124px` Desktop Budget) With High-Zoom Reflow Safety
- `<SiteHeader />` incorporates a persistent **Tier 3 `<StickyEraTimelineBar />`** that scrolls with every page (`sticky top-0`):
  - Displays **`[ All Eras / Current ]`** + all **5 proportional Era segments** (`1945–1961`, `1962–1988`, `1988–2000`, `2000–2018`, `2019–Present`) with accessible hover/focus fisheye magnification (`prefers-reduced-motion` safe), an inline `YYYY-MM-DD` `Decision Date` input, a direct **`Era Definitions ↗`** link (`/eras`), and an expandable **`Watershed Ticks`** strip (`1946`, `1959`, `1963`, `1988`, `1992`, `1997`, `2000`, `2006`, `2008`, `2015`, `2019`, `2022–26`).
  - Desktop persistent 3-tier height stays compact (`<= 144px` with Watershed Ticks collapsed), and at `320px` (`400%` zoom) reflows cleanly with zero horizontal document overflow (`scrollWidth <= clientWidth`).

### Decision 2: Deterministic `decisionDate <-> activeEraId` Synchronization in Browser Memory
- Pure TypeScript helper `resolveEraIdForDate(isoDate)` in `lib/corpus/eras-and-authorities.ts` maps any `YYYY-MM-DD` date deterministically to one of the five canonical Era IDs (`era-1945-1961`, `era-1962-1988`, `era-1988-2000`, `era-2000-2018`, `era-2019-present`), returning `null` when `decisionDate` is `null` (`All Eras / Current Law`).
- Clicking an Era in `<StickyEraTimelineBar />` sets `decisionDate` to that Era's representative date (clicking the already-selected Era or `All Eras` resets to `null`), keeping `/cfr`, `/cases`, `/eras`, `/explore`, and `/` instantaneously synchronized without polluting canonical URLs with `?era=` or `?mode=`.

### Decision 3: Comprehensive `/eras` Definitions, Forms & Chronology Guide + 5 SHA-256-Locked Veteran Overlays
- `/eras` is elevated to primary navigation and expanded into a full single-page + deep-link **Era Definitions & Chronology Reference** featuring:
  1. A **5-Era Side-by-Side Comparison Matrix** (Title 38 numbering system, claim initiation rule, appellate pipeline, *Bell* record-possession rule, and representation fee rule);
  2. An **Era-Bounded Legal & Procedural Definitions Glossary** decoding watershed concepts in plain English and Practitioner precision; and
  3. **Detailed Era-by-Era Reference Cards** coupled with **5 newly authored SHA-256-locked Veteran overlays** (`content/overlays/veteran/era-*.json`), advancing all five `/eras/[slug]` modules to `VERBATIM_VERIFIED`.

### Decision 4: Compile-Time Authority & `VAOPGCPREC` Citator With Honest Bitemporal Era Filtering (`/cases`)
- `lib/corpus/eras-and-authorities.ts` extracts structured authority records at compile time from `docs/vaopgcprec-index.md` (`27+` digested & quarantined `VAOPGCPREC` opinions), `docs/authority-verification-log.md` (`15` verified judicial landmarks), and all `111` modules' `key_precedents` (with reverse `citedByModules` route links, `CAVC Rule 30(a)` / `Fed. Cir. R. 32.1` nonprecedential flags, and `"Checked as of YYYY-MM-DD"` stamps).
- On `/cases`, **`All Eras`** shows the complete directory filterable by **Authority Tier**, **Practice Domain**, **Validity Status**, and **Search**.
- Selecting an Era in `<StickyEraTimelineBar />` immediately filters `/cases` via an explicit two-lens control:
  1. **`Decision Era Governance (Default)`:** Surfaces **Era-Specific / Era-Defining Authorities** governing VA decisions from that era first, displays an explicit **Temporal Cutoffs & Inapplicable Doctrines** caution strip (e.g., flagging that *Bell* constructive possession is barred `< July 21, 1992` and *Hamill* applies strictly `>= Feb. 19, 2019`), and provides an explicit toggle for **Cross-Era Foundational Doctrines** rather than silently guessing single-era tags for general authorities.
  2. **`Opinion Issuance Window`:** Filters deterministically by the year the court or VA OGC issued the opinion (`1989–2026`), displaying an honest historical note when `1945–1961` or `1962–1988` is active explaining `former 38 U.S.C. § 211(a)` pre-VJRA judicial insulation.

