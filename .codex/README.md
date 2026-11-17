# OpenAI Codex Harness Configuration (`vetlawguide`)

Codex reads the root [AGENTS.md](../AGENTS.md) constitution natively and discovers skills under [../.agents/skills/](../.agents/skills/).

## Key Guardrails for Codex Sessions
1. **Package Manager:** Always use `pnpm` (`pnpm test`, `pnpm typecheck`, `pnpm qa:all`). Never run `npm` or `yarn`.
2. **Python Isolation on Windows:** Set `$env:PYTHONNOUSERSITE = "1"` before invoking Python scripts.
3. **Read-Only Upstream Corpus:** Never edit `corpus/upstream/*` directly; run `pnpm corpus:sync` to pull upstream `VA-law-planning` changes and edit web translations in `content/overlays/veteran/`.
4. **Concurrent Milestone Audits:** When running the Codex audit lane, follow [../docs/audit/concurrent-audit-plan.md](../docs/audit/concurrent-audit-plan.md) and write findings (`AUD-CX-001+`) only into Section 2 of [../docs/audit/AUDIT_TRACKER.md](../docs/audit/AUDIT_TRACKER.md).
5. **Anti-Loop `<5s` Inner Loop & Single SSG Sign-Off:** Iterate with `pnpm corpus:compile && pnpm typecheck && pnpm lint && pnpm test && pnpm qa:all` (`<5s`), cap unprimed QA to 1 delta-scoped pass (`<=15` tool calls, zero cold re-spawns), and run `pnpm build && pnpm test:e2e` once right before slice sign-off.
