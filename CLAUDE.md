# CLAUDE.md — Claude Code Instructions for VetLawGuide

This file provides repository guidance to **Claude Code (`claude.ai/code`)** when working in `vetlawguide`.

## 1. Read First (Source-of-Truth Hierarchy)

1. **[AGENTS.md](AGENTS.md)** — Master multi-agent constitution, 13-agent roster, corpus-decomposition rules, and executable `HARD VETO` matrix.
2. **[vision.md](vision.md)** — Master Architectural & Product Vision (`v2.0`) synthesizing founder direction with [claude-vision.md](claude-vision.md) and [chatgpt-vision.md](chatgpt-vision.md).
3. **[BACKLOG.md](BACKLOG.md)** & **[PLAN.md](PLAN.md)** — Active 3-Horizon Rolling-Wave Epic and slice status.
4. **[ADR-0001](docs/adr/ADR-0001-corpus-decomposition-and-pinned-sync-boundary.md)** — Pinned `corpus/upstream/` sync contract, SHA-256-locked Veteran overlays, and 4-state honest coverage model.

---

## 2. Working Agreement: Anti-Drift & Verification Discipline

- **Verify against the tree, never from memory:** Before stating that a route, component, overlay, or upstream module exists or is missing, check the actual filesystem (`corpus/generated/coverage-manifest.json`, `app/`, `components/`, `lib/`).
- **Fix documentation drift in the same session:** If your change alters routes, scripts, coverage counts, or architectural conventions, update `README.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `BACKLOG.md`, and `PLAN.md` before finishing, and run `pnpm qa:historian`.
- **Never hand-edit `corpus/upstream/`:** Upstream legal Markdown and JSON ledgers come from `C:/Users/Dan/VA-law-planning` via `pnpm corpus:sync`. A `PreToolUse` hook blocks direct edits to `corpus/upstream/`.
- **Strict TypeScript & `pnpm` Only:** Package manager is **pnpm** (`pnpm-lock.yaml`). Never set `typescript.ignoreBuildErrors: true` in `next.config.ts`; `pnpm typecheck` (`tsc --noEmit`) must always pass cleanly.

---

## 3. Claude Agent Mirrors & Concurrent Audit

- Specialist definitions live canonically in `.agents/agents/*.md` with Claude Code mirrors in `.claude/agents/*.md`.
- Invoke only the **2–4 specialists** implicated by the active vertical slice, followed by **1 primary unprimed Lane 3 QA pass** (`<=15` tool calls, explicit changed-file/section manifest, zero Round 2/3 cold re-spawns—codify mechanical invariants into `pnpm qa:all` and run `pnpm build && pnpm test:e2e` once at final sign-off).
- For parallel Claude + Codex + Antigravity milestone audits, follow [docs/audit/concurrent-audit-plan.md](docs/audit/concurrent-audit-plan.md).

---

## 4. Essential Commands

```powershell
$env:PYTHONNOUSERSITE = "1"
pnpm corpus:sync        # Pull & SHA-256 lock VA-law-planning snapshot
pnpm corpus:compile     # Compile entity graph, CFR permalinks & coverage-manifest.json
pnpm typecheck          # tsc --noEmit (mandatory)
pnpm test               # Vitest unit & bitemporal compiler/screener tests
pnpm qa:all             # Legal, UPL, Translation Drift, Security & Historian gates
pnpm build              # Full static-first Next.js 16 production build
```
