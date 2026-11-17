---
name: spec-before-code-slice
description: >-
  Use this skill before starting any Epic story or vertical slice in BACKLOG.md.
  Enforces the 6-step Spec-Before-Code workflow: Contract/ADR check, minimal temporal
  or three-valued fixtures, IA & coverage mapping, deterministic implementation,
  unprimed Lane 3 QA gates, and Historian doc lockstep.
---

# Spec-Before-Code Vertical-Slice Protocol (6 Steps)

1. **Step 1 — Scope & Minimal Team (`master-supervisor` + `corpus-ia-architect`):**
   - Read the target story in [BACKLOG.md](../../../BACKLOG.md) and select **only the 2–4 specialists** implicated by the slice.
   - If the slice introduces a new architectural boundary, record a concise `docs/adr/ADR-XXXX-*.md` first.

2. **Step 2 — Hand-Auditable Boundary Fixtures:**
   - Before writing UI/engine code, add deterministic unit fixtures in `tests/unit/` covering temporal boundaries (e.g., FR publication date vs. effective date), coverage gaps (`Do Not Rely`), or three-valued screening (`"unknown" != "no"`).

3. **Step 3 — Ergonomic Route & Coverage Contract:**
   - Confirm how all 4 coverage states (`VERBATIM_VERIFIED`, `SUMMARY_ONLY`, `PLAIN_ENGLISH_IN_PROGRESS`, `CORPUS_GAP_OR_QUEUED_WAVE`) and both personas (`veteran` | `practitioner`) behave on the target surface.

4. **Step 4 — Implementation & `<5s` Fast Inner Loop (`lib/` -> `components/` -> `app/`):**
   - Put parsing/resolution logic in `lib/corpus/` or `lib/screener/`, semantic styles in `app/globals.css` (`@theme inline`), and static route rendering in `app/`.
   - Iterate using `pnpm corpus:compile && pnpm typecheck && pnpm lint && pnpm test && pnpm qa:all` (`<5s`) rather than running full `next build` on intermediate edits.

5. **Step 5 — Capped Unprimed Lane 3 QA & Single SSG Build (`unprimed-qa-gate`):**
   - Dispatch **1** primary unprimed Lane 3 auditor (at most 2 if spanning legal + Veteran copy) with an explicit changed-file/section manifest and `git diff` (**1 pass max; never cold-respawn Round 2/3 subagents**—codify mechanical checks into `pnpm qa:all`, reuse existing `conversationId` via `send_message` only if delta judgment is needed, and log non-blocking polish to `BACKLOG.md`).
   - Run `pnpm build` + `pnpm test:e2e` **once** as the final pre-sign-off verification gate.

6. **Step 6 — Historian & Harness Sync (`historian-pmo-warden`):**
   - Update `[x]` in [BACKLOG.md](../../../BACKLOG.md) and [PLAN.md](../../../PLAN.md), verify `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` / `README.md` accuracy, and confirm `pnpm qa:historian` exits `0`.
