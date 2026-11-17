# Rule 00: The Pragmatic Programmer Engineering Laws

Governed by `pragmatic-architect` ("The Pragmatic Programmer Master"). Every design, module, and pull request must obey six foundational Hunt & Thomas principles:

1. **DRY — Every Piece of Knowledge Must Have a Single, Unambiguous, Authoritative Representation:**
   - Verbatim `38 C.F.R.` text, Federal Register transition dates, Title 38 statutory crosswalks, VA form/acronym definitions, and `kill_switches` each live in **one** compiled source—never re-typed across React components, overlays, or tests.
   - Derive types from schemas/constants (`as const` / Zod / TypeScript interfaces in `lib/corpus/types.ts`) rather than maintaining parallel hand-synced interfaces.

2. **Orthogonality — Eliminate Effects Between Unrelated Things:**
   - Enforce strict one-way module layering:
     - `lib/corpus/` (build-time compiler & temporal math) and `lib/screener/` (three-valued investigation engine) are **100% pure TypeScript**—they must **never** import `react`, `next/*`, or `components/*`.
     - Decouple **Procedural Finality Vehicles** (`§ 3.156(c)`, `§ 3.344`, `CUE`, `§ 5104(b)`) from **Substantive VASRD Merits** (`DC 5000–9918`) so any vehicle composes cleanly with any Diagnostic Code or era.

3. **Design by Contract (`DbC`) & Crash Early:**
   - A dead build does far less damage than a crippled legal reference site. Fail loud at compile/CI time (`pnpm corpus:compile`, `tsc --noEmit`, `SHA-256` overlay drift) on broken links, date overlaps, or missing provenance—never mask errors with `try { ... } catch {}` silent fallbacks, `ignoreBuildErrors: true`, or current-eCFR substitutions.

4. **No Broken Windows:**
   - Never leave dead `shadcn` / `Magic UI` files, unused `package.json` dependencies, `: any` / `as any` type escapes, commented-out code blocks, fake sample data, or stale `AGENTS.md` / `CLAUDE.md` claims in the tree. Fix or delete them in the same session.

5. **Tracer Bullets Over Throwaway Prototypes:**
   - Build thin, production-grade end-to-end vertical slices (`EPIC 1–2`: `§ 4.56` + `§ 4.118` + `Playbook 01` from compiler -> static route -> redline diff -> dual-persona UI -> packet export) before scaling horizontally across all 100+ modules.

6. **`$0.00` Static & Local-First Primacy (Zero Speculative Bloat):**
   - Before adding any database, server runtime, external API, or heavy npm dependency, ask: *Can this be computed deterministically at build time or in pure client-side TypeScript at `$0.00` recurring cost and `0ms` network latency?*
   - Reject speculative plugin layers, premature abstractions, or configuration knobs not required by an active story in `BACKLOG.md`.
