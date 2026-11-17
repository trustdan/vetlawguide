# Concurrent Tri-Harness Repository Audit Plan (`vetlawguide`)

Adapted from `dojojutsu`'s parallel audit architecture. Output ledger: [AUDIT_TRACKER.md](AUDIT_TRACKER.md).

## 1. Division of Audit Lanes

Run three independent audit sessions against the same `vetlawguide` checkout at major Epic milestones, each writing only to its own section of [AUDIT_TRACKER.md](AUDIT_TRACKER.md):

| Harness Lane | Definition | Primary Audit Lens | Mapped `AGENTS.md` Roles |
| :--- | :--- | :--- | :--- |
| **Claude Code** | `.claude/agents/qa-bitemporal-legal-auditor.md` & `.claude/agents/qa-upl-plain-english-warden.md` | Long-chain bitemporal legal accuracy (*George*, `§ 20.1409(c)`, `Rule 30(a)`, `RIN` quarantine), UPL boundaries, Veteran overlay fidelity, and `CLAUDE.md`/`AGENTS.md` claim truth | `#3`, `#4`, `#6`, `#10`, `#11` |
| **OpenAI Codex** | `.codex/README.md` & `.agents/skills/concurrent-tri-harness-audit/SKILL.md` | Pragmatic Programmer orthogonality/anti-bloat (`#2`), deterministic compiler invariants (`supersedes` chains, FR pub-vs-eff edge dates), three-valued screener logic (`Unknown != No`), security/PII/CSP checks, and `tsc` / Vitest probes | `#2`, `#5`, `#7`, `#8`, `#12` |
| **Google Antigravity** | `.agents/agents/qa-a11y-browser-verifier.md` + `browser` subagent | Live browser walkthroughs, `WCAG 2.2 AA+`, `200%–400%` zoom reflow (~84px header budget), `<GitHubCorner />` reduced-motion, `1:1` Outline parity, and Playwright `/investigate` network silence | `#8`, `#9`, `#11`, `#12`, `#13` |

---

## 2. Rules of Engagement

1. **Read-Only Audit Pass:** During a concurrent audit, lanes inspect source, run verification commands, and record findings (`AUD-CL-001`, `AUD-CX-001`, `AUD-AG-001` upward—never recycling IDs). Do not edit application code during the parallel audit pass.
2. **Tool Lock Separation:** Codex owns `pnpm typecheck` and `pnpm test`; Claude owns `pnpm qa:legal`, `pnpm qa:upl`, `pnpm qa:drift`, and `pnpm qa:historian`; Antigravity owns live browser / Playwright `pnpm test:e2e` runs so `.next` / Playwright artifacts never collide.
3. **Unprimed Evidence Format:** Every finding must record `Severity` (`P0`–`P3`), `Status` (`OPEN` / `VERIFIED_FIXED`), `HEAD` SHA, exact file/line or route URL, reproduction trigger, expected vs. actual behavior, and required regression test.
