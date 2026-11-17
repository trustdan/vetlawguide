# Rule 04: Calm Research Desk Craft, Motion Restraint & Accessibility (`WCAG 2.2 AA+`)

1. **Compact Three-Tier Sticky Chrome (`<= 144px` Desktop Budget) + `<GitHubCorner />` Peel (`ADR-0006`):**
   - Persistent top chrome (`<SiteHeader />`) comprises three compact tiers that scroll with every page (`sticky top-0`): Tier 1 Slim Educational Disclaimer Bar, Tier 2 Brand + `[ Veterans | Practitioners ]` toggle + primary nav + `⌘K` search, and Tier 3 `<StickyEraTimelineBar />` (`[ All Eras / Current ]` + 5 proportional `1945–2026` Era segments + inline `YYYY-MM-DD` `Decision Date` input + expandable Watershed Ticks). Keep collapsed desktop height `<= 144px` and ensure clean, zero-overflow reflow on `200%–400%` (`320px`) zoomed viewports.
   - Pin `<GitHubCorner />` in the top-right viewport corner (right-padding Tier 1 & Tier 2 cleanly clear of the peel), linking to `https://github.com/trustdan/vetlawguide/issues` with accessible `aria-label` (*"Questions, bugs, or citation issues? Open a GitHub Issue"*) and static fallback under `prefers-reduced-motion: reduce`.

2. **Warm Editorial Palette & Zero Semantic Raw Hex:**
   - Define all colors, typography, radii, and coverage badges as semantic CSS custom properties inside `app/globals.css`'s Tailwind v4 `@theme inline` block (warm archival paper + crisp ink in light mode; calm deep navy + high-contrast parchment in dark mode). Never scatter raw hex values across component JSX.

3. **Purposeful Motion Only:**
   - Never place continuously moving decorative borders (`BorderBeam` loops, pulsing neon) around statutory or regulatory text.
   - Reserve `motion/react` (v12) for moments that communicate spatial structure or deliberate craft: the `<GitHubCorner />` hover/focus peel, Two-Pane view transitions, timeline scrubbing, and progressive branch expansion in `/explore`. Every animation MUST honor `prefers-reduced-motion`.

4. **Universal Keyboard, Touch & Screen-Reader Parity:**
   - Every hover interaction (citation preview cards, fisheye timeline milestones, redline annotations) MUST have a 1:1 keyboard (`Tab`/`Enter`/`Escape`) and touch (`tap`) equivalent.
   - Pair the `/explore` `d3-hierarchy` SVG Knowledge Map 1:1 with a synchronized **Accessible Outline View** (never install heavy canvas node-editors like `@xyflow/react` or `three`).
