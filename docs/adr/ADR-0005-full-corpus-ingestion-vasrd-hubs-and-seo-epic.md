# ADR-0005: Full `VA-law-planning` Corpus Ingestion (`W1–W5`), 15-System VASRD Web Hubs & Final SEO Gate

- **Status:** Approved (`2026-11-16`)
- **Supersedes / Extends:** Advances bookmark state in [ADR-0002](ADR-0002-wave-bookmark-ingestion-and-honest-placeholders.md) from `W1` (`10` starter files) to `W5` (`111 / 111` verified upstream modules); extends [ADR-0001](ADR-0001-corpus-decomposition-and-pinned-sync-boundary.md) Decision 2 & Decision 4
- **Governs:** `corpus/ingestion-ledger.json`, `lib/corpus/`, `app/vasrd/`, `app/eras/`, `app/cfr/modules/`, `BACKLOG.md`, `PLAN.md`

---

## 1. Context

1. **Upstream Completion (`C:\Users\Dan\VA-law-planning`):** `VA-law-planning` has completed all `10 / 10` Epics (`EPIC-00` through `EPIC-09`), passing `validate_kb.py` with `0` errors across **`111` primary-source-verified legal modules** (`34` `authority-snapshot`, `27` `cfr-diff`, `23` `playbook`, `13` `doctrine`, `9` `checklist`, `5` `era-lens`) and **`102` `cfr-amendments.json` version records** covering all 15 VASRD Body Systems and all 13 Practice Domains.
2. **Elimination of Premature-Churn Risk:** `ADR-0002` originally held `Waves W2–W5` at the bookmark gate while `VA-law-planning` was still authoring modules and while `vetlawguide` proved its core architecture across `EPIC 0`–`EPIC 4`. With both upstream authoring (`100%`) and `vetlawguide`'s vertical-slice architecture (`EPIC 0`–`EPIC 4`) complete, holding `101` finished modules as placeholders artificially starves `/cfr`, `/timeline`, `/explore`, `/cases`, and grounded chat.
3. **Web-Format Decomposition Requirement:** More than half of `VA-law-planning` (`61 / 111` modules) consists of multi-section `authorities/` verbatim snapshots (`34`) and multi-era `cfr-diffs/` comparison/trap guides (`27`). Simply unlocking `W2–W5` without upgrading `lib/corpus/` would leave those `61` modules without dedicated web reader pages or body-system organization.
4. **Search & Citation Discoverability Sequencing:** Technical and entity SEO (`sitemap.ts`, `robots.ts`, `alternates.canonical`, `Legislation`/`DefinedTermSet` JSON-LD, OpenGraph citation cards, and long-tail `DC`/`38 C.F.R.` landing verification) must run as the **final pre-launch Epic (`EPIC 9`)** once all `111` modules, visualizations, precedent pages, and plain-English overlays are settled.

---

## 2. Decisions

### Decision 1: Complete 5-Wave Ledger Mapping & Full Unlock (`W1–W5` = `111` Modules)
- `corpus/ingestion-ledger.json` explicitly maps all `111` upstream modules across `W1` (`10`), `W2` (`19`), `W3` (`27`), `W4` (`38` Part 4 Subpart A + 15 VASRD Body System snapshots/diffs + Playbooks `18–19`), and `W5` (`17` Effective Dates, Offsets, Pension/Waivers, Evidence, AMA/Board, CAVC, `§§ 1725/1728`, VR&E & Fees/EAJA modules).
- `activeBookmark` advances to `"W5"` with `activeUnlockedWaves: ["W1", "W2", "W3", "W4", "W5"]` (`heldAtGateModules = 0`).

### Decision 2: Ergonomic Web Routes for All `111` Modules & 16 VASRD Hubs (Zero Raw Folder Nav)
- **Playbooks (`23`), Treatises (`13`), Checklists (`9`), and Era Lenses (`5`):** Compile into `/playbooks/[slug]`, `/docs/[slug]`, `/checklists/[slug]`, and `/eras/[slug]` (backed by a dedicated `/eras` chronological hub).
- **Multi-Section Verbatim Snapshots (`34`) & Historical Regulatory Diffs (`27`):**
  - Single-section decomposed CFR hubs (`38-cfr-4.56`, `38-cfr-4.118`, `38-cfr-3.156c`, expanding in `E5-S2`) retain canonical `/cfr/[section]` & `/cfr/[section]/[effectiveFrom]` permalinks.
  - All multi-section `authority-snapshot` and `cfr-diff` modules compile into full 3-column AST reader pages at `/cfr/modules/[slug]` (preserving verbatim regulatory blockquotes, Federal Register metadata tables, trap matrices, C-file triggers, and `kill_switches`), cross-linked bi-directionally with `/cfr/[section]` version chains.
- **16 Static VASRD Body-System Hubs (`/vasrd` & `/vasrd/[systemId]`):** Every entry in `CANONICAL_VASRD_SYSTEMS` (`part-4-general-policy` + Systems `01` through `15`) renders a dedicated hub uniting its Diagnostic Code range (`DC 5000–9918`), verbatim `38 C.F.R.` snapshots, historical `cfr-diff` matrices, issue-spotting playbooks, and point-in-time `/cfr/[section]` chains.

### Decision 3: Chain-Cohesive `sectionSlug` Resolution (`lib/corpus/temporal.ts`)
- Connected `supersedes` / `superseded_by` regulatory chains that share a primary CFR section number (e.g., `"former 38 C.F.R. § 1.963(b)(1)–(2)"` -> `"38 C.F.R. § 1.963(a)–(b)"`, or `"former 38 C.F.R. §§ 4.149 & 4.150"` -> `"38 C.F.R. § 4.150 (§ 4.149 [Reserved])"`) resolve to a single concise, Windows-`MAX_PATH`-safe canonical `sectionSlug` while keeping cross-section many-to-one consolidations (`§ 4.16(c)` + `§ 4.132` -> `§ 4.130`) distinct. Compiler validation enforces unique `(sectionSlug, effective_from)` pairs across all static routes.

### Decision 4: Progressive Veteran Overlay Parity & Final `EPIC 9` SEO Gate
- Newly unlocked `W2–W5` modules without a handcrafted `content/overlays/veteran/<id>.json` file carry explicit `PLAIN_ENGLISH_IN_PROGRESS` status in `coverage-manifest.json` and `<CoverageBanner />` (rendering structured reference blocks with inline `<LexiconText />` acronym/form decoding and `<CrossInspectionExpander />`), advancing to `VERBATIM_VERIFIED` as SHA-256-locked Veteran overlays are authored across `E5-S3` and `E5-S4`.
- `EPIC 9` (Technical, Legal-Citation & Entity SEO, Structured Data & Search Discoverability) executes strictly last after `EPIC 5`–`EPIC 8` complete.
