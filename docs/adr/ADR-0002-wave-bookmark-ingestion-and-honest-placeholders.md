# ADR-0002: Wave-Bookmark Corpus Ingestion (`ingestion-ledger.json`) & Honest Structural Placeholders

- **Status:** Approved (`2026-11-16`)
- **Supersedes / Refines:** Extends [ADR-0001](ADR-0001-corpus-decomposition-and-pinned-sync-boundary.md) Decision 1
- **Governs:** `corpus/ingestion-ledger.json`, `content/taxonomy-skeleton.ts`, `scripts/sync_corpus.ts`, `scripts/corpus_bookmark_status.ts`, `components/bitemporal/planned-module-placeholder.tsx`

---

## 1. Context

`VA-law-planning` is actively expanding toward `~105–125+` modules while `vetlawguide` builds out its UI, bitemporal views, and hash-locked Veteran plain-English overlays. Pulling every completed upstream file into `corpus/upstream/` at once creates two operational hazards:
1. **Lost Ingestion Bookmark:** Contributors cannot immediately distinguish modules that have been fully curated, cross-linked, and QA-verified in `vetlawguide` from raw bulk-synced files.
2. **Premature Churn:** Ongoing upstream edits on later waves create noisy diffs before `vetlawguide` has built or reviewed those domain surfaces.

---

## 2. Decisions

### Decision 1: Allowlist-Gated Wave Bookmark (`corpus/ingestion-ledger.json`)
- `corpus/ingestion-ledger.json` is the single authoritative bookmark of which `VA-law-planning` waves (`W1` through `W5`) are unlocked in `vetlawguide`.
- `pnpm corpus:sync` copies **only** the Markdown modules belonging to waves listed in `activeUnlockedWaves` (starting strictly with **`Wave 1`: the 10-file Combat/Scar/Muscle/Finality/Crosswalk/Lexicon starter subgraph**), pruning un-unlocked Markdown files from `corpus/upstream/`.
- `pnpm corpus:bookmark` (`scripts/corpus_bookmark_status.ts`) prints the exact ingestion watermark (`Wave 1 Active: 10 files pulled` vs. `Waves 2–5 Held as Placeholders`).

### Decision 2: Complete Taxonomy Skeleton & Honest Placeholders (`content/taxonomy-skeleton.ts`)
- All 15 VASRD Body Systems, all 13 Practice Domains, and planned Wave `W2–W5` routes exist in `content/taxonomy-skeleton.ts` from Epic 1.
- Internal Markdown links inside `Wave 1` files that point to `Wave 2–5` files resolve deterministically to valid placeholder routes (`/playbooks/[slug]`, `/cfr/[section]`, `/eras/[slug]`) rather than 404ing or forcing a bulk pull, while links to nonexistent paths still fail compilation.
- Every placeholder route renders `<PlannedModulePlaceholder />` with its assigned Wave (`W2`–`W5`), explicit `"Not Yet Published on VetLawGuide — Do Not Rely"` status, and direct official `eCFR` / `GovInfo` links—never fake sample prose.
