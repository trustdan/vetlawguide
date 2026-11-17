# VetLawGuide — Milestone Execution Checklist (`PLAN.md`)

> Locked 1:1 with [BACKLOG.md](BACKLOG.md) and verified by `pnpm qa:historian` (`scripts/historian_audit.ts`).

## Phase 0 (`EPIC 0`): Infrastructure, Multi-Agent Harness & Corpus Bridge
- [x] **`E0-S1`:** Master Constitution (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`), Rules (`00..05`), `ADR-0001` & Audit Tracker
- [x] **`E0-S2`:** 13-Agent Supervisor / Pragmatic / Specialist / Unprimed-QA Roster, Lifecycle Hooks & 5 `SKILL.md` Runbooks
- [x] **`E0-S3`:** Zero-PII `.github/ISSUE_TEMPLATE/`, CI + Federal Register Workflows & Next.js 16 (`pnpm`) Scaffold
- [x] **`E0-S4`:** Pinned `VA-law-planning` Sync (`manifest.lock.json`) & Deterministic Corpus Compiler (`coverage-manifest.json`)
- [x] **`E0-S5`:** Executable Lane 3 QA Gates (Legal, UPL/UX, Drift, Security, Historian) & Vitest Suite

## Phase 1 (`EPIC 1`): Bookmark Gate, Editorial Design System & Compact ~84px Global Chrome
- [x] **`E1-S1`:** Allowlist Wave Bookmark (`corpus/ingestion-ledger.json` = `Wave 1`, `ADR-0002`), Taxonomy Skeleton & `pnpm corpus:bookmark`
- [x] **`E1-S2`:** Warm Editorial / Dark Navy Design Tokens (`@theme inline`), `ThemeProvider` & Semantic Coverage/Quarantine Styles
- [x] **`E1-S3`:** Compact ~84px Two-Tier Header (Disclaimer Modal, Zero-Flash Audience Toggle, `Decision Date` Popover, `⌘K` Search)
- [x] **`E1-S4`:** Top-Right Animated `<GitHubCorner />` Tear-Away Octocat Peel (`prefers-reduced-motion` Safe)
- [x] **`E1-S5`:** `<SourceProvenancePanel />`, `<CoverageBanner />`, `<CrossInspectionExpander />`, `<PlannedModulePlaceholder />` & QA Sign-Off

## Phase 2 (`EPIC 2`): Point-in-Time `38 C.F.R.` Reader, Redline Diffs & Two-Pane Temporal View
- [x] **`E2-S1`:** Static Per-Version CFR Routes (`/cfr/38-cfr-4.56/*`, `/cfr/38-cfr-4.118/*`, `/cfr/38-cfr-3.156c/*`) & `?date=` Resolver
- [x] **`E2-S2`:** Deterministic Side-by-Side & Inline Visual Redline Diffs + Upstream Trap Narratives
- [x] **`E2-S3`:** `<TwoPaneTemporalView />` (`Law Then` vs. `Vehicles Today`) & Quarantined `90 FR 46542` Caution Striping
- [x] **`E2-S4`:** SHA-256-Locked Veteran Plain-English Overlays for `Wave 1` CFR Sections
- [x] **`E2-S5`:** Dual-Mode `Decision Date`-Reactive `osintframework.com` `d3-hierarchy` SVG Tree (`/explore` + `/`) & Full-Site Persona Toggle Parity

## Phase 3 (`EPIC 3`): Situation-Led Home, Unified `⌘K` Search, Crosswalk & 3-Column Reader
- [x] **`E3-S1`:** Situation-Led `/` Hero + Touch/Keyboard Fisheye Timeline Rail Preview
- [x] **`E3-S2`:** Deterministic DC / `38 C.F.R.` / Legacy `U.S.C.` / Form Lookup + Explainable `⌘K` Search
- [x] **`E3-S3`:** 3-Column `/playbooks`, `/docs` & `/checklists` Reader + Accessible Citation & Acronym Popovers
- [x] **`E3-S4`:** Dedicated Interactive `/crosswalk` (`1933 <-> 1958 <-> 1991`) & `/reference/forms-and-codes` Views

## Phase 4 (`EPIC 4`): Historical Decision Investigation Workspace (`/investigate`)
- [x] **`E4-S1`:** Three-Valued (`Yes / No / Unknown`) Wave 1 Pathway & Bitemporal `T₀` Resolution Engine (`lib/screener/`)
- [x] **`E4-S2`:** Browser-Memory-Only `/investigate` Intake & Missing-Records Checklist Desk
- [x] **`E4-S3`:** Explainable Pathway Trigger Cards & Printable Veteran / Practitioner Discussion Packets (`ADR-0004`)
- [x] **`E4-S4`:** Zero-Network (`prefetch={false}`), Zero-URL-Leakage, `WCAG 2.2 AA+` & `400%` Zoom E2E Proof

## Phase 10 (`EPIC 10` — Active Next): Editorial Visual Hierarchy, Compact Mobile Chrome & Focused Gateway Home
- [ ] **`E10-S1`:** Self-Hosted `Newsreader` / `Geist` / `Geist Mono` Fonts, Readable Type Scale (`16–18px` Body / `>=13px` Floor), Neutral Charcoal Dark Mode, Navy/Ochre Rationing & Favicon
- [ ] **`E10-S2`:** Public Build-Vocabulary Copy Scrub & Automated `pnpm qa:upl` Jargon Gate
- [ ] **`E10-S3`:** `ADR-0007`, Visitor-Question Navigation (`Browse · Ratings · Investigate · Law · Guides · Reference ▾`) & Compact Mobile Header / Era Chip (`<= 120px` at `390px`)
- [ ] **`E10-S4`:** Focused 5-Element Gateway Home (`<= 250` Words), Routing Fixes & First 4 Cut-Paper Gateway Illustrations (`public/illustrations/*.webp`)
- [ ] **`E10-S5`:** Mobile Usable-Viewport E2E Assertions (`>= 50%` Content at `400%` Zoom) & Capped Lane 3 Accessibility/UPL Sign-Off

## Phase 12 (`EPIC 12` — Active Chrome Fix): Authentic `Ideation-Lab-Web` GitHub Octocat Corner Ribbon
- [ ] **`E12-S1`:** Authentic Diagonal Corner-Peeking Octocat (`viewBox="0 0 250 250"`), `octocatWave` Hover/Focus Arm, Non-Blocking `pointer-events` Hit-Testing & Archival Theme Tokens
- [ ] **`E12-S2`:** Header Click-Through, `prefers-reduced-motion`, Dark-Mode Contrast & `400%` Zoom Playwright E2E Proof

## Phase 11 (`EPIC 11` — Queued Before `EPIC 6`): Visitor-Need Browse Directory (`/explore`), Progressive Disclosure & Full Illustration Set
- [ ] **`E11-S1`:** Data-Driven 5-Branch Browse Directory Default (`/explore`), Live Coverage Badges & Short-Label Secondary Map Toggle
- [ ] **`E11-S2`:** `/cases` Compact Scannable Rows, Result Counts, Client Pagination (`25/page`) & Expandable Holdings
- [ ] **`E11-S3`:** Staged Browser-Memory `/investigate` Wizard + 3-Block Summary & Dominant Single-Column Readers
- [ ] **`E11-S4`:** Regenerate 2 Style-Bleed Secondary Illustrations, Optimize All 5 Secondary Cut-Paper Assets & Prune Raw `docs/ux/*.jpeg` Masters

## Phase 5 (`EPIC 5`): Full `VA-law-planning` Corpus Import (`111` Modules), Web Decomposition & 15-System VASRD Rollout
- [x] **`E5-S1`:** Full `VA-law-planning` (`111` Modules / `122` Compiled CFR Snapshots) Sync (`W1–W5`), Chain-Cohesive Compiler, `/cfr/modules/[slug]`, `/vasrd/[systemId]` (`16` Hubs) & `/eras` (`ADR-0005`)
- [x] **`E5-S2`:** Sticky Global `<StickyEraTimelineBar />` (`WK-private-demo` Style), Comprehensive `/eras` Definitions & Matrix Guide + `5` SHA-256-Locked Veteran Era Overlays (`ADR-0006`)
- [x] **`E5-S3`:** Multi-Era Per-Version Heading Extraction & Side-by-Side Redline Expansion Across `Part 3`, `Part 4` & `Part 20` (`34` Redline Families / `174` Snapshots)
- [ ] **`E5-S4`:** SHA-256-Locked Veteran Plain-English Overlays for Remaining `Wave 2` (`14` Modules) & `Wave 3` (`27` Modules — Home-Gateway Topics First)
- [ ] **`E5-S5`:** SHA-256-Locked Veteran Plain-English Overlays for `Wave 4` (`38` VASRD Modules) & `Wave 5` (`17` Litigation/Offset Modules — `111/111` Parity)
- [ ] **`E5-S6`:** Full-Corpus Three-Valued `/investigate` Pathway Expansion Integrated Into `E11-S3` Staged Questions & 3-Block Summary

## Phase 6 (`EPIC 6`): Visual Exploration Tools & Multi-Track Law Timeline (`/timeline`)
- [ ] **`E6-S1`:** Interactive SVG Piercing-Finality Decision Flowchart Featured from `Browse` + Synchronized Accessible Outline
- [ ] **`E6-S2`:** Short-Label (`<= 4` Words) Era-Driven Branching & Semantic Relationship Edges in Secondary `Map` View (`lib/corpus/knowledge-tree.ts`)
- [ ] **`E6-S3`:** Dedicated `/timeline` Single-Home 4-Track Interactive Chronology + Quarantined Rulemaking Watchlist & Cleaned `timeline` Illustration
- [ ] **`E6-S4`:** Timeline/Tree Vitest Suite & Playwright `WCAG 2.2 AA+`, Reduced-Motion & `400%` Zoom Reflow Proof

## Phase 7 (`EPIC 7`): Curated Precedent & `VAOPGCPREC` Directory (`/cases`) + Tri-Harness Audit
- [x] **`E7-S1`:** Deterministic Citator & `VAOPGCPREC` Extractor (`docs/vaopgcprec-index.md` + `docs/authority-verification-log.md` + `111`-Module `key_precedents`, `ADR-0006`)
- [x] **`E7-S2`:** Era-Reactive `/cases` Authority Directory Synchronized to Top Sticky Era Bar, Reverse Module Links, `CAVC Rule 30(a)` Guardrails & `"Checked as of"` Dates
- [ ] **`E7-S3`:** Concurrent Claude + Codex + Antigravity Tri-Harness Milestone Audit (`docs/audit/AUDIT_TRACKER.md` — Including Nav, Mobile Header & Progressive Disclosure)

## Phase 8 (`EPIC 8`): Grounded Corpus Research Chat (`gpt-5-nano` + `WK-private-demo` Widget + Supabase Analytics, `ADR-0003`)
- [ ] **`E8-S1`:** `$0.00` Build-Time Citation/DC/Form + BM25 Hybrid Retriever (`lib/chat/retrieve.ts`) & `WK-private-demo`-Style Prompt-Cached System Spine (`lib/chat/system-prompt.ts`)
- [ ] **`E8-S2`:** Streaming `/api/chat` Route (`gpt-5-nano` Zero-Training Tier), `botid` + IP Rate Limit & Server `redactPii()` Scrubber
- [ ] **`E8-S3`:** `WK-private-demo`-Style Floating `<ChatWidget />` Pill, `Maximize2`/`Minimize2` Streaming Reader, `<OpenChatLink />` & Client PII Blocker
- [ ] **`E8-S4`:** Supabase `chat_conversations` Analytics Store (`lib/chat/log-conversation.ts` + RLS Migration), `after()` Upsert & Consent-Gated Session/MP Attribution
- [ ] **`E8-S5`:** Grounding, PII-Redaction, `/investigate` Zero-Leakage Isolation & `WCAG 2.2 AA+` / `400%` Zoom Chat E2E Suite

## Phase 9 (`EPIC 9` — Final Pre-Launch Epic): Technical, Legal-Citation & Entity SEO + Consent-Gated Google Analytics
- [ ] **`E9-S1`:** `metadataBase`, Canonical URL Consolidation (`alternates.canonical`), `app/robots.ts` & Provenance-Stamped `app/sitemap.ts`
- [ ] **`E9-S2`:** Dual-Intent `generateMetadata()` (`DC`, `38 C.F.R.`, `U.S.C.`, `VAOPGCPREC` & Plain-English Queries) + Cut-Paper Archival `next/og` Citation Cards
- [ ] **`E9-S3`:** Schema.org Legal JSON-LD Graph (`Legislation`, `Article`, `DefinedTermSet`, `BreadcrumbList`)
- [ ] **`E9-S4`:** `<=2`-Click `DC` / `38 C.F.R.` Crawl Jump-Directories Unified Under `Browse`, `/llms.txt` Citation Manifest & Automated `pnpm qa:seo` Gate
- [ ] **`E9-S5`:** `WK-private-demo`-Style `<ConsentProvider />`, Consent-Gated GA4 (`gtag.js` + Measurement Protocol), Hard `/investigate` Telemetry Blackout & `/privacy` Page
