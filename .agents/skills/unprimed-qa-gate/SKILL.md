---
name: unprimed-qa-gate
description: >-
  Use this skill to run VetLawGuide's independent Lane 3 QA verification gates
  (Legal/Bitemporal, UPL/Plain-English, Translation Drift, Privacy/Zero-Network,
  Historian, and WCAG 2.2 AA+ Browser Accessibility) before marking any slice DONE.
---

# Unprimed Lane 3 QA Gate Runbook

## 1. Automated Deterministic Gate Suite

Run from repository root (`c:\Users\Dan\vetlawguide`):

```powershell
$env:PYTHONNOUSERSITE = "1"
pnpm typecheck
pnpm lint
pnpm test
pnpm qa:all
```

Where `pnpm qa:all` executes all five domain/governance verifiers:
1. `pnpm qa:legal` (`scripts/qa_legal_provenance_audit.ts`) — Banned slogans (`"100% verified"`, `"zero hallucination"`, `"CUE Safe"`, `"lifetime"` Board CUE), `CAVC Rule 30(a)` qualifiers, `RIN` quarantine, and `cfr-amendments.json` date-chain integrity.
2. `pnpm qa:upl` (`scripts/qa_ux_upl_audit.ts`) — Raw `SCREAMING_SNAKE_CASE` / schema enum leaks, directive UPL phrasing bans, and Veteran overlay schema completeness.
3. `pnpm qa:drift` (`scripts/audit_translation_drift.ts`) — Verifies every `content/overlays/veteran/*.json` matches `corpus/manifest.lock.json` `SHA-256` hashes.
4. `pnpm qa:security` (`scripts/security_pii_audit.ts`) — Verifies `manifest.lock.json` SHA-256 digests against `corpus/upstream/`, scans for SSN/VA-file PII, secrets, banned lockfiles, and hook integrity.
5. `pnpm qa:historian` (`scripts/historian_audit.ts`) — Enforces `BACKLOG.md` <-> `PLAN.md` lockstep, unbroken `ADR-XXXX` sequence, and zero orphan `.md` files.

## 2. Fast Inner Loop vs. Single Final SSG Build Gate

1. **Fast Inner Loop (`<5s` — run during development & defect fixes):**
   ```powershell
   $env:PYTHONNOUSERSITE = "1"
   pnpm corpus:compile
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm qa:all
   ```
2. **Outer Build & Browser Gate (run ONCE right before slice sign-off):**
   - Run `pnpm build && pnpm test:e2e` (`@axe-core/playwright`, `200%–400%` zoom reflow, `prefers-reduced-motion`, and zero-network/zero-URL-leakage assertions). Never rebuild all static SSG pages repeatedly inside an audit loop.

## 3. Capped, Delta-Scoped Subagent Dispatch (Anti-Loop Protocol)

1. **1 Primary Gatekeeper by Default:** Dispatch only the **single** Lane 3 auditor matching the slice's primary risk (`qa-bitemporal-legal-auditor` for `lib/corpus/` & CFR slices; `qa-upl-plain-english-warden` for overlays/copy; `qa-a11y-browser-verifier` for layout/visual slices; `qa-privacy-devsecops-sentinel` for `/investigate` & DevSecOps). Dispatch 2 only when a slice substantially alters both legal extraction and Veteran copy.
2. **Explicit File & Section Manifest (Never Full-Corpus Cold Crawls):** Pass **only** the governing ADR/slice spec, the explicit list of changed files/routes/sections, and `git diff`—never prime with reassuring narrative and never ask a subagent to re-read untouched sections across the entire corpus. Instruct the subagent to stay within a tight `<=15` tool-call budget.
3. **Hard 1-Pass + Delta-Only Cap (Zero Cold Re-Spawns):**
   - Run **at most 1** initial unprimed subagent pass per slice.
   - Batch-fix all true `HARD VETO` defects AND codify any structural/mechanical check directly into `scripts/qa_legal_provenance_audit.ts` or `scripts/qa_ux_upl_audit.ts` (`<2s`).
   - Never call `invoke_subagent` to spawn a brand-new Round 2/3 cold auditor. Verify fixes via `pnpm qa:all` + unit tests; if subjective follow-up judgment is required, use `send_message` to the **existing** auditor `conversationId` scoped strictly to the delta lines. Log non-blocking polish items to `BACKLOG.md` rather than restarting the QA loop.
