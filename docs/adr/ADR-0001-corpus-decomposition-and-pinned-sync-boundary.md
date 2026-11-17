# ADR-0001: Corpus Decomposition, Pinned Sync Boundary & Four-State Honest Coverage

- **Status:** Approved (`2026-11-16`)
- **Deciders:** Founder / Attorney Product Owner, `master-supervisor`, `corpus-ia-architect`
- **Governs:** `corpus/`, `content/overlays/`, `lib/corpus/`, `scripts/sync_corpus.ts`, `scripts/audit_translation_drift.ts`

---

## 1. Context & Problem Statement

`vetlawguide` builds a public, dual-audience (`Veterans` | `Practitioners`), bitemporal Veterans Law research platform from `C:\Users\Dan\VA-law-planning`. Three structural tensions must be resolved cleanly:

1. **Authoring Topology vs. Research Ergonomics:** `VA-law-planning` enforces strict Diátaxis Mode Purity across six folders (`authorities/`, `cfr-diffs/`, `docs/`, `eras/`, `playbooks/`, `checklists/`), often grouping multiple eras or multiple `38 C.F.R.` sections inside one Markdown snapshot while keeping regulatory evolution prose in `cfr-diffs/`. Exposing those raw folders as top-level navigation forces users to hunt across disconnected silos.
2. **Single Source of Truth vs. Dual-Persona Clarity:** `VA-law-planning` is authored in dense practitioner shorthand. Mixing Veteran plain-English prose into `VA-law-planning` files would violate its Mode Purity law, while maintaining unlinked Veteran pages in `vetlawguide` would silently drift when upstream rules, effective dates, or `kill_switches` change.
3. **Active Upstream Expansion & Partial Temporal Coverage:** `VA-law-planning` currently contains `73` primary-source-verified modules (expanding toward `~105–125+` across `EPIC-03 Waves 3D/3F/3G`, `EPIC-06`, `EPIC-07`, and `EPIC-09`), and `cfr-amendments.json` intentionally indexes litigated provisions rather than all of Title 38. Naive date filtering risks silently falling back to current eCFR text or presenting broken/misleading navigation.

---

## 2. Decisions

### Decision 1: Vendored, Read-Only Pinned Upstream Snapshot (`corpus/upstream/` + `corpus/manifest.lock.json`)
- `pnpm corpus:sync` (`scripts/sync_corpus.ts`) copies validated files from `VA-law-planning` (`authorities/`, `cfr-diffs/`, `docs/`, `eras/`, `playbooks/`, `checklists/`, `knowledge/`, `schemas/`, `BACKLOG.md`) into `corpus/upstream/` and writes `corpus/manifest.lock.json` recording the upstream `git` commit SHA, branch/tag, sync timestamp (`checked_as_of`), and per-file `SHA-256` digests.
- Vercel builds directly from this committed, reproducible snapshot—requiring zero cross-repo deploy keys, PATs, or fragile git submodules.
- `.agents/hooks/corpus_lock_guard.py` (`PreToolUse`) hard-blocks agents from hand-editing any file inside `corpus/upstream/`. Legal corrections always happen upstream in `VA-law-planning` followed by `pnpm corpus:sync`.

### Decision 2: Compile-Time Entity Decomposition (`lib/corpus/` -> `corpus/generated/`)
Rather than rendering upstream folders 1:1, `pnpm corpus:compile` transforms `corpus/upstream/` into user-centric compiled indices:
- **Per-Section & Per-Version CFR Entities (`/cfr/[section]` & `/cfr/[section]/[effective-from]`):** Pairs `cfr-amendments.json` chains (`supersedes` / `superseded_by`) with heading-extracted verbatim blocks from `authorities/` AND attaches the corresponding `cfr-diffs/` evolution/trap analysis directly to the same CFR hub.
- **Bidirectional Statutory Crosswalk (`1933 <-> 1958 <-> 1991`):** Parsed from `docs/title-38-statutory-crosswalk.md` into structured lookup entries powering `/crosswalk` and inline era-aware `<StatuteCite>` annotations.
- **Global Acronym, Form & Code-Sheet Lexicon:** Parsed from `docs/forms-and-codesheet-lexicon.md` to drive `⌘K` deterministic form/code lookup and automatic Veteran-mode inline tooltips.
- **Canonical Precedent & `VAOPGCPREC` Graph:** Aggregates `docs/vaopgcprec-index.md`, `docs/authority-verification-log.md`, and `key_precedents` across all modules with reverse `"Cited In"` links and `"Treatment checked as of"` dates.

### Decision 3: Cryptographically Bound Veteran Overlays (`content/overlays/veteran/`)
- Plain-English Veteran explanations, Situation Entry linkages, and printable *"Questions & Records to Discuss With Your Representative"* checklists live in `vetlawguide/content/overlays/veteran/<upstream-id>.json` (or `.yaml`).
- Every overlay records `upstream_id`, `upstream_sha256`, and `linked_version_ids`.
- `scripts/audit_translation_drift.ts` (`pnpm qa:drift`) verifies every overlay's `upstream_sha256` against `corpus/manifest.lock.json` and fails CI whenever an upstream edit invalidates a Veteran summary.

### Decision 4: Four-State Honest Coverage Matrix (`corpus/generated/coverage-manifest.json`)
All **15 VASRD Body Systems** and **13 Practice Domains** appear in site navigation from Day 1, with every CFR query, VASRD system, and module assigned one of four explicit coverage states:
1. `VERBATIM_VERIFIED` — Primary-source verbatim text verified for the queried date, with `GovInfo` / `Federal Register` citation and check date.
2. `SUMMARY_ONLY` — Regulatory transition indexed as `summary-only-pull-print-cfr-before-cue`; displays explicit warning to pull the print CFR edition before pleading CUE.
3. `PLAIN_ENGLISH_IN_PROGRESS` — Upstream practitioner module is `primary-source-verified`; Veteran plain-English overlay is queued; displays transparent notice with inline acronym tooltips active over the structured reference.
4. `CORPUS_GAP_OR_QUEUED_WAVE` — Unindexed historical CFR date window OR an upstream `VA-law-planning` wave (`Waves 3D/3F/3G`, `Epics 06–07`) still in progress; displays explicit **"Not Yet Indexed — Do Not Rely"** / queued-wave card with direct official `GovInfo` / `eCFR` fallback links, **never** silently substituting current eCFR text.

---

## 3. Consequences

- **Positive:** Zero cross-repo CI/Vercel fragility; zero duplication of verbatim `38 C.F.R.` text; automatic detection of audience drift; complete taxonomy stability as `VA-law-planning` grows from `73` to `125+` modules.
- **Trade-Off:** Syncing upstream corpus updates is an explicit, auditable command (`pnpm corpus:sync && pnpm qa:all`) rather than an unreviewed live fetch—an intentional safeguard required by [vision.md](../../vision.md) §5.1.
