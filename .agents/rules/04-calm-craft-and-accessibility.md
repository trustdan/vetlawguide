# Rule 04: Calm Research Desk Craft, Motion Restraint & Accessibility (`WCAG 2.2 AA+`)

1. **Compact Three-Tier Sticky Chrome (`<= 144px` Desktop / `<= 120px` Mobile Budget) + `<GitHubCorner />` Ribbon (`ADR-0006`, `ADR-0007`):**
   - Persistent top chrome (`<SiteHeader />`) comprises three compact tiers that scroll with every page (`sticky top-0`): Tier 1 Slim Educational Disclaimer Bar (`"Educational reference only. Not legal advice."` + cautions modal), Tier 2 Brand + `[ Veterans | Practitioners ]` toggle + visitor-question nav (`Browse · Ratings · Investigate · Law · Guides · Reference ▾`, collapsing to `Menu` + `Search` on narrow screens), and Tier 3 `<StickyEraTimelineBar />` (inline 5-Era `1945–2026` ribbon on desktop temporal views; persistent `"Law as of: Today ▾"` / active `YYYY-MM-DD` chip + sheet on narrow screens and gateway routes). Keep desktop height `<= 144px`, mobile (`390px`) height `<= 120px`, and preserve `>= 50%` usable viewport height with zero horizontal overflow at `320×640` (`400%` zoom).
   - Pin `<GitHubCorner />` in the top-right viewport corner (`pointer-events-none` outer link with `pointer-events-auto` strictly on the diagonal triangle & Octocat SVG paths so underlying header controls are never blocked), linking to `https://github.com/trustdan/vetlawguide/issues` with accessible `aria-label` (*"Questions, bugs, or citation issues? Open a GitHub Issue"*) and static fallback under `prefers-reduced-motion: reduce`.

2. **Warm Editorial Palette, Neutral Charcoal Dark Mode & `>= 13px` Type Floor:**
   - Define all colors, self-hosted `next/font/local` typography (`Newsreader`, `Geist`, `Geist Mono`), radii, and coverage badges as semantic CSS custom properties inside `app/globals.css`'s Tailwind v4 `@theme inline` block (warm archival paper + charcoal ink in light mode; neutral charcoal `#17181a`/`#1f2023`/`#26282c` + warm parchment `#ecebe6` + soft blue `#9db8dc` links in dark mode). Never scatter raw hex values across component JSX, keep explanatory prose at `16–18px` (`65–75ch`), and maintain a `13px` minimum floor on metadata and citations.

3. **Purposeful Motion Only:**
   - Never place continuously moving decorative borders (`BorderBeam` loops, pulsing neon) around statutory or regulatory text.
   - Reserve `motion/react` (v12) for moments that communicate spatial structure or deliberate craft: the `<GitHubCorner />` hover/focus peel, Two-Pane view transitions, timeline scrubbing, and progressive branch expansion in `/explore`. Every animation MUST honor `prefers-reduced-motion`.

4. **Universal Keyboard, Touch & Screen-Reader Parity:**
   - Every hover interaction (citation preview cards, fisheye timeline milestones, redline annotations) MUST have a 1:1 keyboard (`Tab`/`Enter`/`Escape`) and touch (`tap`) equivalent.
   - Pair the `/explore` `d3-hierarchy` SVG Knowledge Map 1:1 with a synchronized **Accessible Outline View** (never install heavy canvas node-editors like `@xyflow/react` or `three`).
