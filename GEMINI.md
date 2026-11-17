# GEMINI.md — Project Context & Host Environment Profile (Google Antigravity & Gemini CLI)

## 1. Project Identity & Core Architecture

**VetLawGuide** (`vetlawguide.com`) is a static-first **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4** Veterans Law reference library and historical decision investigation workspace. It compiles and translates the primary-source-verified legal corpus from `C:\Users\Dan\VA-law-planning` into a dual-audience (`Veterans` | `Practitioners`), bitemporal web platform governed by [AGENTS.md](AGENTS.md) and [vision.md](vision.md).

---

## 2. Critical Windows Host & Runtime Rules

1. **Package Manager (`pnpm` Only):** Use `pnpm` (`12.x`, Node `22.x`). Never run `npm install` or `yarn` or commit `package-lock.json` / `yarn.lock`. On Windows inside Antigravity, run package-mutating commands (`pnpm install`, `pnpm add`, `pnpm remove`) outside the sandbox (`BypassSandbox: true`) per terminal rules, while running `pnpm test`, `pnpm typecheck`, `pnpm qa:all`, and `pnpm build` in standard mode when supported.
2. **Python Isolation (`PYTHONNOUSERSITE=1`):** On this Windows workstation (`Python 3.13`), global user site-packages (`AppData\Roaming\Python\Python313\site-packages`) contain experimental native builds that can fault if imported unexpectedly. Always set `$env:PYTHONNOUSERSITE = "1"` (or pass `python -s`) when running Python hooks (`.agents/hooks/*.py`) or invoking upstream `VA-law-planning/scripts/validate_kb.py`.
3. **Pinned Corpus Boundary (`corpus/upstream/`):** Never edit files under `corpus/upstream/` directly (`.agents/hooks/corpus_lock_guard.py` enforces a hard `PreToolUse` deny). Sync upstream updates with `pnpm corpus:sync` and author web-layer Veteran translations in `content/overlays/veteran/`.
4. **Browser & Visual Verification:** For visual layout, `200%–400%` zoom reflow (`<= 144px` three-tier sticky header + `<StickyEraTimelineBar />` budget per `ADR-0006`), `<GitHubCorner />` reduced-motion behavior, and `/investigate` UI walkthroughs, delegate live inspection to the Antigravity `browser` subagent alongside automated Playwright suites (`pnpm test:e2e`).
5. **Anti-Loop Subagent & QA Efficiency (`<5s` Inner Loop):**
   - **Fast Inner Loop vs. Single Final Build:** Iterate using `pnpm corpus:compile && pnpm typecheck && pnpm lint && pnpm test && pnpm qa:all` (`<5s`). Run `pnpm build && pnpm test:e2e` **once** right before slice sign-off—never rebuild all static SSG pages repeatedly inside an audit loop.
   - **Capped, Delta-Scoped Unprimed QA (Zero Cold Re-Spawns):** Invoke only the **2–4** implicated slice specialists plus **1 primary Lane 3 QA auditor** (at most 2 when spanning both legal extraction and Veteran copy) via `invoke_subagent`, passing **only** the governing ADR/slice spec, an explicit changed-file/section manifest, and `git diff` (`<=15` tool-call budget; never cold-crawl untouched corpus sections). Run **at most 1** initial unprimed pass: batch-fix true `HARD VETO` items, codify mechanical invariants into `pnpm qa:legal` / `pnpm qa:upl` (`<2s`), never call `invoke_subagent` for Round 2/3 cold re-spawns (use `send_message` to the existing auditor `conversationId` only if subjective delta judgment is required), and log non-blocking polish to [BACKLOG.md](BACKLOG.md).

---

## 3. Customizations Map

- **Master Constitution & Backlog:** [AGENTS.md](AGENTS.md), [BACKLOG.md](BACKLOG.md), [PLAN.md](PLAN.md)
- **Lifecycle Hooks:** [.agents/hooks.json](.agents/hooks.json) (`pii_guard.py` + `corpus_lock_guard.py`)
- **Modular Rules:** `.agents/rules/00-*.md` through `05-*.md`
- **13 Specialist, Supervisor & Unprimed QA Agents:** `.agents/agents/*.md`
- **5 Operational Skills:** `.agents/skills/*/SKILL.md`
