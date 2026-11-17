# Rule 05: On-Device Privacy, Security Hygiene & Stack Standards

1. **Strict On-Device `/investigate` Privacy (Verified Network Silence):**
   - Screening answers (`case-screen.schema.json`), disability selections, and exported packets in `/investigate` stay **strictly in client browser memory**:
     - **Zero URL Serialization:** Never write screening answers into `window.location.search` or `window.location.hash` (unlike public CFR version URLs, which *are* shareable).
     - **Zero Network / Telemetry Leakage:** Zero XHR, `fetch`, `sendBeacon`, or analytics events may fire during `/investigate` interaction or print/Markdown export (enforced by `tests/e2e/privacy-network-silence.spec.ts`).
   - Three-Valued Screening Invariant: `"I Don't Know"` (`"unknown"`) must **never** be coerced to `false`; it must surface the missing document in **"Records to Locate & Why"**.

2. **Zero Client PII Anywhere in Repo or Public Issues:**
   - Never commit SSNs, VA file numbers, service numbers, veteran names, DD-214s, or private medical facts into Git (`.agents/hooks/pii_guard.py` + `pnpm qa:security`).
   - `.github/ISSUE_TEMPLATE/*.yml` forms must prominently warn visitors never to include SSNs, VA claim numbers, or private medical details in public GitHub Issues.

3. **Stack, Package Manager & Build Discipline:**
   - Stack: **Next.js 16 (App Router, static-first SSG)**, **React 19**, **TypeScript 5 (strict)**, **Tailwind CSS v4 (`@theme inline`)**, **shadcn/ui ("new-york")**, **`motion/react` v12**, **`d3-hierarchy`**, **Vitest**, and **Playwright + `@axe-core/playwright`**.
   - Package manager is **pnpm** exclusively (`pnpm-lock.yaml`). Never run `npm` or `yarn`.
   - Never set `typescript.ignoreBuildErrors: true` or `eslint.ignoreDuringBuilds: true`. Every slice requires `0` errors across `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm qa:all`.
