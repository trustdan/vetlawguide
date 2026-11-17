---
name: concurrent-tri-harness-audit
description: >-
  Use this skill at major Epic milestones to coordinate or execute a concurrent
  read-only repository audit across Claude Code, OpenAI Codex, and Google Antigravity
  writing into docs/audit/AUDIT_TRACKER.md.
---

# Concurrent Tri-Harness Milestone Audit (`Claude + Codex + Antigravity`)

Follow [docs/audit/concurrent-audit-plan.md](../../../docs/audit/concurrent-audit-plan.md) and write findings **only** to your active harness's section in [docs/audit/AUDIT_TRACKER.md](../../../docs/audit/AUDIT_TRACKER.md).

## Session Launch Prompts

- **Claude Code (`AUD-CL-*`):**
  > Read `CLAUDE.md`, `.claude/agents/qa-bitemporal-legal-auditor.md`, and `docs/audit/concurrent-audit-plan.md`. Run `pnpm qa:legal`, `pnpm qa:upl`, `pnpm qa:drift`, and `pnpm qa:historian`, audit long-chain bitemporal legal/UPL claims against the tree, and record findings only in Section 1 of `docs/audit/AUDIT_TRACKER.md`. Do not edit source code.

- **OpenAI Codex (`AUD-CX-*`):**
  > Read `AGENTS.md`, `.codex/README.md`, and `docs/audit/concurrent-audit-plan.md`. Run `pnpm typecheck`, `pnpm test`, and `pnpm qa:security`, probe compiler date boundaries and three-valued screener invariants, and record findings only in Section 2 of `docs/audit/AUDIT_TRACKER.md`. Do not edit source code.

- **Google Antigravity (`AUD-AG-*`):**
  > Activate `concurrent-tri-harness-audit`, read `.agents/agents/qa-a11y-browser-verifier.md` and `docs/audit/concurrent-audit-plan.md`, run `pnpm test:e2e` and live `browser` subagent checks (`200%–400%` zoom, `prefers-reduced-motion`, `<GitHubCorner />`, keyboard/touch parity), and record findings only in Section 3 of `docs/audit/AUDIT_TRACKER.md`. Do not edit source code.
