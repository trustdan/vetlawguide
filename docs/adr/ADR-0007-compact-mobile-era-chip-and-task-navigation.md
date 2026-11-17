# ADR-0007: Compact Mobile Era Chip, Visitor-Question Navigation & Neutral Charcoal Dark Mode

- **Status:** Approved (`2026-11-17`)
- **Amends:** [ADR-0006](ADR-0006-sticky-era-timeline-and-bitemporal-authority-directory.md) Decision 1 (persistent three-tier sticky header budget); updates [vision.md](../../vision.md) §§ 2 & 4.1 and [04-calm-craft-and-accessibility.md](../../.agents/rules/04-calm-craft-and-accessibility.md) §§ 1–2
- **Governs:** `components/chrome/site-header.tsx`, `components/chrome/sticky-era-timeline-bar.tsx`, `components/chrome/github-corner.tsx`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/playbooks/page.tsx`

---

## 1. Context

1. **Mobile & High-Zoom Viewport Crowding (`ADR-0006` Decision 1 Trade-Off):** Under `ADR-0006` Decision 1, rendering all five proportional Era buttons (`1945–1961` through `2019–Present`), `All Eras`, the `YYYY-MM-DD` date input, `Milestones`, and `Era Guide` inline on every viewport caused the sticky header to wrap into a multi-row grid on narrow screens (`~389px` of an `844px` phone screen at `390px` width and `~435px` of `640px` at `320×640` `400%` zoom), crowding out primary reading content.
2. **Mechanics-First Navigation & Missing `/vasrd` Entry:** Primary navigation (`Eras · 38 C.F.R. · Playbooks · Cases · Explore · Investigate`) led with internal content formats rather than visitor questions and omitted the 15-system disability rating schedule (`/vasrd`).
3. **Typography, Navy Saturation & Dark-Mode Surface Contrast:** `app/globals.css` referenced `Newsreader`, `Geist`, and `Geist Mono` without self-hosting font files via `next/font/local`, relied on `9–11px` micro-typography across dense badges, used blue-tinted `.dark` surfaces (`#0d131f` / `#131c2e`), and applied `primary` navy to non-interactive labels as well as links.
4. **Public Build Vocabulary & Overloaded Home Page:** Public UI surfaces exposed internal roadmap vocabulary (`Active Bookmark: W5`, `Held as Placeholders`, `Wave 1 Tracer Bullet`, `3-Column`, `Morph Tree by Decision Date`, `d3-hierarchy`) and stacked eight demo widgets on `/`.

---

## 2. Decisions

### Decision 1: Responsive Era Selector — Inline Desktop Ribbon on Temporal Views, Compact `"Law as of"` Chip + Sheet on Narrow Screens (`Amends ADR-0006 Decision 1`)
- On narrow viewports (`< 1024px`)—and by default on non-temporal gateway routes (`/` and `/investigate`)—`<StickyEraTimelineBar />` collapses into a persistent single-line **`"Law as of: Today ▾"`** chip (displaying the exact active `YYYY-MM-DD` date and Era window whenever selected so temporal context is never hidden). Clicking the chip opens an accessible disclosure sheet containing `All Eras`, all five `1945–2026` Era segments, the `YYYY-MM-DD` date input, expandable `Milestones` ticks, and `/eras`.
- On desktop viewports (`>= 1024px`) across temporal reference routes (`/cfr*`, `/cases*`, `/eras*`, `/vasrd*`, `/explore*`, `/timeline*`), the inline 5-Era ribbon remains directly clickable inside `<SiteHeader />` (`<= 144px` total desktop height).
- **Hard Viewport Budgets:** Sticky header height stays **`<= 120px`** at `390×844` mobile width and preserves **`>= 50%` usable content height** (`<= 320px` header height) at `320×640` (`400%` zoom) with zero horizontal overflow.

### Decision 2: Visitor-Question Primary Navigation & Unified `Guides` Hub
- Tier 1 disclaimer shortens to **`"Educational reference only. Not legal advice."`** paired with the accessible `Scope & CUE/Deadline Cautions` modal trigger.
- Primary navigation standardizes across **both** `Veterans` and `Practitioners` modes (never shifting nav order when switching personas) as:
  **`Browse` (`/explore`) · `Ratings` (`/vasrd`) · `Investigate` (`/investigate`) · `Law` (`/cfr`) · `Guides` (`/playbooks`) · `Reference ▾`** (`Cases`, `Historical Eras`, `Statutory Crosswalk`, `Forms & Code-Sheet Decoder`, `Checklists`, `Legal Treatises`).
- `/playbooks` (**Guides**) absorbs `/docs` and `/checklists` via client-side category tabs (`All · Issue Guides · Legal Treatises · Checklists`) while keeping every `/docs/*` and `/checklists/*` permalink intact. On narrow screens, primary nav collapses into an accessible `Menu` sheet alongside `Search`.

### Decision 3: Self-Hosted Fonts, `>= 13px` Type Floor, Neutral Charcoal `.dark` Palette & Public Copy Gate
- Self-host `Newsreader`, `Geist`, and `Geist Mono` via `next/font/local` (`zero` external font network calls, preserving strict `/investigate` network silence).
- Set explanatory reading prose to `16–18px` (`65–75ch` measure) and enforce a `13px` (`0.8125rem`) minimum floor on metadata, badges, and citations (eliminating `9–12px` arbitrary pixel classes).
- Replace blue-tinted `.dark` surfaces with `WCAG 2.2 AA+`-verified neutral charcoal tokens (`--background: #17181a`, `--surface: #1f2023`, `--surface-elevated: #26282c`, `--muted: #2e3035`, `--border: #3a3d42`, `--foreground: #ecebe6`, `--muted-foreground: #b5b3ab`, `--primary: #9db8dc`, `--accent: #d9a441`), rationing `primary` to links/selected controls and `accent` to primary CTAs and the authentic diagonal Octocat corner ribbon (`EPIC 12`).
- Enforce zero leaked build vocabulary (`Bookmark`, `Tracer Bullet`, `Held as Placeholders`, `3-Column`, `Morph Tree`, `d3-hierarchy`, raw `(/route)` link labels) via `scripts/qa_ux_upl_audit.ts` (`pnpm qa:upl`), and focus `/` on five elements (`<= 250` words per persona): headline + 1-sentence lead, Search, four cut-paper illustrated gateways, direct-link row, and plain-language footer provenance.
