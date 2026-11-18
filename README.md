# VetLawGuide (`vetlawguide.com`)

> **Calm Research Desk Meets Modern Craft:** Connecting specific VA rating and Board decisions, the exact point-in-time historical and modern law governing them, and the concrete records needed to investigate what happened—backed by inspectable primary sources rather than black-box claims.

`[...............ᗧ] 100% (57/57 Slices Complete: All Epics 0–12 Shipped, Grounded Chat & Pre-Launch SEO/Consent Verified)`

---

## 1. Architecture Overview

`vetlawguide` is a static-first **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4** web application that compiles and translates the primary-source-verified legal corpus from `VA-law-planning` into an ergonomic, dual-audience (`Veterans` | `Practitioners`), bitemporal Veterans Law research desk.

1. **Pinned Upstream Corpus (`corpus/upstream/` + `corpus/manifest.lock.json`):** Consumes deterministic, SHA-256-verified snapshots from `VA-law-planning` (`authorities/`, `cfr-diffs/`, `docs/`, `eras/`, `playbooks/`, `checklists/`, `knowledge/`, `schemas/`). Upstream files in `corpus/upstream/` are strictly read-only (`PreToolUse` hook enforced).
2. **Deterministic Corpus Compiler (`lib/corpus/`):** Decomposes multi-era and multi-section Markdown modules into permanent per-version `38 C.F.R.` routes (`/cfr/[section]/[effective-from]`), bidirectional `1933 <-> 1958 <-> 1991` statutory crosswalk tables, structured acronym/form tooltips, precedent back-links, and an explicit 4-state `coverage-manifest.json` (`VERBATIM_VERIFIED`, `SUMMARY_ONLY`, `PLAIN_ENGLISH_IN_PROGRESS`, `CORPUS_GAP_OR_QUEUED_WAVE`).
3. **Hash-Locked Dual-Persona Overlays (`content/overlays/veteran/`):** Binds plain-English Veteran explanations and printable *"Questions & Records for Your Representative"* sheets to upstream legal modules via `upstream_sha256` + `version_id` pointers so legal updates automatically flag dependent summaries in CI.
4. **Zero-Network `/investigate` Screening Engine (`lib/screener/`):** Pure client-side three-valued (`Yes / No / Unknown`) case-investigation engine where `"I Don't Know"` populates *"Records to Locate & Why"* checklists rather than silently dropping legal pathways, verified for complete network and URL silence by Playwright E2E gates.
5. **Grounded Corpus Research Chat (`lib/chat/` + `app/api/chat/route.ts`):** `$0.00` build-time hybrid citation/DC/BM25 retriever (`< 2ms`), prompt-cached `gpt-5-nano` zero-training commercial API streaming, client + server `redactPii()` firewall, and RLS-locked Supabase `chat_questions` user-question-only logging (`ADR-0003`).
6. **Legal-Citation SEO & Consent-Gated Analytics (`lib/seo/` + `ConsentProvider`):** Canonical URL consolidation across `388` static routes, Schema.org `Legislation` / `TechArticle` / `DefinedTermSet` JSON-LD, `/llms.txt`, `<= 2`-click HTML jump directories, and opt-in `vlg_consent` analytics with unconditional `/investigate` blackout.

---

## 2. Quickstart Commands (`pnpm` Only)

```powershell
pnpm install              # Install dependencies (never use npm or yarn)
pnpm corpus:sync          # Sync & SHA-256 lock active Bookmark Wave into corpus/upstream/
pnpm corpus:compile       # Compile corpus/generated/ entity graph & coverage-manifest.json
pnpm corpus:bookmark      # Print active Wave ingestion bookmark (Wave 5: 111/111 verified modules live)
pnpm typecheck            # Strict TypeScript check (tsc --noEmit)
pnpm lint                 # ESLint check
pnpm test                 # Run Vitest unit & bitemporal compiler/screener/chat/SEO suite
pnpm qa:seo               # Verify 388 canonical routes, /llms.txt, JSON-LD & <=2-click crawl depth
pnpm qa:all               # Run Legal, UPL/UX, Translation Drift, Security, Historian & SEO gates
pnpm test:e2e             # Run Playwright WCAG 2.2 AA+, zoom, SEO/consent & /investigate silence checks
pnpm dev                  # Start local Next.js 16 dev server
pnpm build                # Compile corpus + static-first production build
```

---

## 3. Repository Documentation & Governance Index (Zero Orphans)

Every Markdown document in this repository is indexed below (`scripts/historian_audit.ts` enforces zero unindexed `.md` files):

### Core Product Vision & Briefs
- [vision.md](vision.md) — Master Architectural & Product Vision (`v2.0`).
- [VA-LAW-CORPUS-AND-LLM-BRIEF.md](VA-LAW-CORPUS-AND-LLM-BRIEF.md) — Upstream `VA-law-planning` data specification and domain brief.
- [antigravity-vision.md](antigravity-vision.md) — Initial `v1` architectural draft (superseded by `vision.md`).
- [claude-vision.md](claude-vision.md) — Independent architectural critique integrated into `vision.md` `v2.0`.
- [chatgpt-vision.md](chatgpt-vision.md) — Independent product & research-desk review integrated into `vision.md` `v2.0`.

### Multi-Agent Governance, Roadmaps & Harnesses
- [AGENTS.md](AGENTS.md) — Master Multi-Agent Constitution, 13-agent roster, and Executable Hard-Veto Matrix.
- [CLAUDE.md](CLAUDE.md) — Claude Code entrypoint and anti-drift verification contract.
- [GEMINI.md](GEMINI.md) — Google Antigravity & Gemini CLI host profile (`PYTHONNOUSERSITE=1`, `pnpm`).
- [BACKLOG.md](BACKLOG.md) — Pragmatic 3-Horizon Rolling-Wave Epic & Slice Backlog (`Epics 0–12`).
- [PLAN.md](PLAN.md) — High-level Epic & Slice milestone checklist locked 1:1 with `BACKLOG.md`.
- [.codex/README.md](.codex/README.md) — OpenAI Codex harness notes and concurrent-audit launcher.

### Architecture Decision Records (`docs/adr/`)
- [ADR-0001: Corpus Decomposition, Pinned Sync Boundary & 4-State Honest Coverage](docs/adr/ADR-0001-corpus-decomposition-and-pinned-sync-boundary.md)
- [ADR-0002: Wave-Bookmark Corpus Ingestion (`ingestion-ledger.json`) & Honest Structural Placeholders](docs/adr/ADR-0002-wave-bookmark-ingestion-and-honest-placeholders.md)
- [ADR-0003: Grounded Corpus Chat Agent — Model Economics (`gpt-5-nano`), Local Hybrid Retrieval & Client PII Firewall](docs/adr/ADR-0003-grounded-chat-agent-model-and-retrieval.md)
- [ADR-0004: Three-Valued Investigation Engine, Bitemporal Pathway Ordering & Zero-Network Export Contract](docs/adr/ADR-0004-three-valued-investigation-engine-and-zero-network-export.md)
- [ADR-0005: Full `VA-law-planning` Corpus Ingestion (`W1–W5`), 15-System VASRD Web Hubs & Final SEO Gate](docs/adr/ADR-0005-full-corpus-ingestion-vasrd-hubs-and-seo-epic.md)
- [ADR-0006: Persistent Sticky Era-Timeline Chrome, Comprehensive Era Definitions Hub & Bitemporal Era-Reactive Authority Directory](docs/adr/ADR-0006-sticky-era-timeline-and-bitemporal-authority-directory.md)
- [ADR-0007: Compact Mobile Era Chip, Visitor-Question Navigation & Neutral Charcoal Dark Mode](docs/adr/ADR-0007-compact-mobile-era-chip-and-task-navigation.md)
- [ADR-0008: Dedicated Piercing-Finality Flowchart Route, Semantic Map Edges & Single-Home `/timeline` Chronology](docs/adr/ADR-0008-visual-piercing-finality-flowchart-and-single-home-timeline.md)

### Concurrent Tri-Harness Audit (`docs/audit/`)
- [docs/audit/concurrent-audit-plan.md](docs/audit/concurrent-audit-plan.md) — Parallel Claude + Codex + Antigravity audit protocol.
- [docs/audit/AUDIT_TRACKER.md](docs/audit/AUDIT_TRACKER.md) — Shared lane-isolated milestone audit ledger.

### UI/UX Simplification Specification (`docs/ux/`)
- [docs/ux/ui-ux-simplification-recommendations.md](docs/ux/ui-ux-simplification-recommendations.md) — Home page, Browse directory, navigation, mobile header, visual-system, progressive-disclosure & cut-paper illustration specification (adopted into `EPIC 10` & `EPIC 11`).

### Workspace Rules (`.agents/rules/`), Agents (`.agents/agents/`) & Skills (`.agents/skills/`)
- **Rules:** [00-pragmatic-programmer.md](.agents/rules/00-pragmatic-programmer.md), [01-corpus-ssot-and-sync.md](.agents/rules/01-corpus-ssot-and-sync.md), [02-bitemporal-and-legal-precision.md](.agents/rules/02-bitemporal-and-legal-precision.md), [03-dual-persona-and-upl-safety.md](.agents/rules/03-dual-persona-and-upl-safety.md), [04-calm-craft-and-accessibility.md](.agents/rules/04-calm-craft-and-accessibility.md), [05-privacy-security-and-stack.md](.agents/rules/05-privacy-security-and-stack.md).
- **Agents (`.agents/agents/` & `.claude/agents/`):** `master-supervisor`, `pragmatic-architect`, `corpus-ia-architect`, `historian-pmo-warden`, `corpus-compiler-engineer`, `dual-persona-translator`, `bitemporal-screener-engineer`, `nextjs-craft-engineer`, `visual-systems-cartographer`, `qa-bitemporal-legal-auditor`, `qa-upl-plain-english-warden`, `qa-privacy-devsecops-sentinel`, `qa-a11y-browser-verifier`.
- **Skills (`.agents/skills/`):** `sync-and-compile-corpus`, `spec-before-code-slice`, `author-veteran-overlay`, `unprimed-qa-gate`, `concurrent-tri-harness-audit`.
