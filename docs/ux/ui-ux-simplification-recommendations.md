# UI/UX Simplification Recommendations

- **Date:** 2026-11-16 (Adopted 2026-11-17)
- **Status:** Adopted into [BACKLOG.md](../../BACKLOG.md) and [PLAN.md](../../PLAN.md) as **`EPIC 10` (`E10-S1`–`E10-S5`)** and **`EPIC 11` (`E11-S1`–`E11-S4`)** queued ahead of `EPIC 6` and `E5-S6`.
- **Inputs:** a source review by Claude Code (home page, header, theme tokens, tree, index pages, backlog) and a rendered-page review by ChatGPT (home, Explore, Ratings, Cases, Investigate, one playbook). This document merges the two.

---

## 1. Summary

The site's problem is hierarchy, not capability. Too many things are shown at once, they all have the same visual weight, and one colour does every job. Artwork will give the site character, but most of the improvement comes from showing less.

The recommendations, in priority order:

1. **Cut the home page to five elements:** headline, search, four illustrated gateways, a short row of direct links, and a quiet footer.
2. **Make a folder-style directory the main way in.** Relabel `/explore` as **Browse**, show a collapsible directory by default, and keep the branching map as an alternative view of the same data.
3. **Rebuild the navigation around visitor questions:** Browse, Ratings, Investigate, Law, Guides, Reference.
4. **Shrink the header**, on phones first. The era selector collapses to a single chip on narrow screens.
5. **Fix the visual system:** load the fonts, raise text sizes, ration the navy, make dark mode neutral, and use fewer boxes.
6. **Remove build vocabulary from public copy** ("Bookmark", "Wave", "Tracer Bullet", "3-Column").
7. **Add progressive disclosure to the long pages** (Cases, Investigate, Explore).
8. **Add four matching illustrations** on the home page, then extend the set.

Section 9 proposes a short simplification epic to carry this, placed before Epic 6.

---

## 2. Diagnosis

### 2.1 Findings and evidence

| Finding | Evidence | Source |
|---|---|---|
| Navy does every job | `primary` utility classes appear 260 times in 41 files; `accent` appears 30 times in 12 files | Code search |
| Dark mode is navy on navy | Every dark surface, border and link token in `app/globals.css` is a blue tint | Code |
| No imagery exists | There is no `public/` folder: no favicon, logo or illustration | Code |
| The designed fonts never load | `globals.css` names Newsreader and Geist, but nothing in `app/` or `components/` loads them, so visitors get Georgia and Segoe UI | Code search |
| Type is very small | Widespread 10–12px text (`text-xs`, `text-[11px]`, `text-[10px]`, `text-[9px]`) | Code |
| Home page is a product demo | Eight stacked sections in `app/page.tsx`; about 4,300px tall and about 1,500 words at desktop width | Code; measurements from ChatGPT's render |
| Mobile header crowds out content | About 389px of an 844px screen at 390px wide; about 435px of 640px at 320px wide | ChatGPT's render (not re-measured; the markup supports it, since the five era buttons wrap to a two-column grid) |
| Cases page is unbounded | All 437 authorities render with no pagination (`cases-directory-client.tsx`); about 58,000px tall | Code; height from ChatGPT's render |
| Investigate is very long | About 11,300px before the workflow is complete | ChatGPT's render |
| Build vocabulary is public | "Active Bookmark: W5", "Held as Placeholders", "Live Wave 1 Tracer Bullet", "Open Full 3-Column Playbook", "Morph Tree by Decision Date", route paths inside link labels, "d3-hierarchy" in body copy | Code |
| Tree badges are stale | `lib/corpus/knowledge-tree.ts` still hard-codes "Wave 2 Queued", "Queued W2", "Queued W3" (lines 334–384) although all 111 modules are live | Code |
| Tree labels are too long for a map | Many labels run 50–70 characters; the SVG has a 760px minimum width and scrolls sideways | Code |
| `/explore` does three jobs | The tree is followed by a crosswalk table and the full lexicon, both of which have dedicated pages | Code |
| Navigation leads with mechanics | Nav order is Eras, 38 C.F.R., Playbooks, Cases, Explore, Investigate; `/vasrd` is absent | `components/chrome/site-header.tsx` |
| Two home cards point to the wrong place | The rating card links to `/cfr` instead of `/vasrd`; the survivor card links to the whole playbook list | `content/situations.ts` |
| Plain-English coverage is thin | 15 of 111 modules have Veteran overlays | `BACKLOG.md` |

### 2.2 What is working and should be kept

- The warm-paper light theme is a good base.
- The audience toggle, source provenance and coverage states give the site a clear, honest purpose.
- Search with explained matches is the fastest route for anyone who arrives with a citation or code.
- The accessible outline view of the tree already exists and is most of a directory.

---

## 3. Navigation and page prominence

### 3.1 Priority of destinations

| Priority | Destination | Route | Role |
|---|---|---|---|
| 1 | Browse topics | `/explore` | Main directory; first nav item and first home gateway |
| 2 | Disability ratings | `/vasrd` | Entry by condition, body system or diagnostic code |
| 3 | Investigate a decision | `/investigate` | Flagship guided task, with its supported scope stated up front |
| 4 | Law and cases | `/cfr`, `/cases` | Reference entry for regulations by date and authorities |
| 5 | Guides | `/playbooks` | Organised by subject; absorbs `/docs` and `/checklists` as tabs or filters |
| 6 | Survivor and family benefits | Directory branch for now | Direct link from home |
| 7 | Eras, timeline, crosswalk, forms decoder | `/eras`, `/timeline` (planned), `/crosswalk`, `/reference/forms-and-codes` | Supporting tools, reached from Reference and from relevant topics |

Investigate is deliberately not first. Its engine covers only the Wave 1 pathways until `E5-S6` lands, so making it the hero would over-promise.

### 3.2 Proposed primary navigation

`Browse · Ratings · Investigate · Law · Guides · Reference ▾`

- **Law** opens `/cfr`, with Cases one click away.
- **Reference** holds Cases, Eras, Timeline, Crosswalk, Forms decoder and Checklists.
- Labels stay the same in both audience modes, so switching mode never moves the navigation.

### 3.3 Routing fixes that can ship immediately

- Point the "Research a Disability Rating" card at `/vasrd`.
- Point the survivor card at the survivor branch of the directory until a focused survivor topic page exists.

---

## 4. Home page

### 4.1 Target composition

1. **Headline and one sentence.** One version per audience mode, as today, but shorter.
2. **Search**, as the most prominent element.
3. **Four illustrated gateways**, each with a short title, one sentence and one destination:
   - Browse topics → `/explore`
   - Disability ratings → `/vasrd`
   - Investigate a decision → `/investigate` (with a one-line scope note)
   - Law and cases → `/cfr`, with a secondary "Cases and opinions" link to `/cases`
4. **A row of direct links:** Survivor benefits, Missing records, Rating reductions.
5. **Footer** with the educational notice, coverage counts and source information.

### 4.2 What leaves the home page

| Current section | Where it goes |
|---|---|
| Bookmark / wave status strip | Footer or an "About the data" page |
| Five link chips under search | Replaced by the gateways and Reference menu |
| Five situation cards | Folded into the four gateways and the direct-link row |
| Fisheye timeline rail | `/timeline` once built; `/eras` until then |
| Embedded knowledge tree | `/explore` |
| "Wave 1 Tracer Bullet" worked example and provenance panel | The Playbook 01 page |
| Featured playbooks | `/playbooks` |
| 16-row VASRD coverage matrix | `/vasrd` |

### 4.3 Acceptance criteria

- No more than about 250 words and about two desktop screens tall.
- The search box and all four gateways are visible without scrolling at 1280×800.
- At 390px wide, the search box and the first gateway are visible without scrolling.
- No wave, bookmark or release identifiers above the footer.

---

## 5. Browse: directory and map

### 5.1 Structure

Use a taxonomy built on visitor needs, not on upstream folders such as `authorities/` or `cfr-diffs/`:

```text
Browse topics
├── Disability ratings
├── Older decisions and review options
├── Survivor and family benefits
├── Records, forms, and unfamiliar terms
└── Law, cases, and historical changes
```

Inside each branch, tag every destination with a plain type label: **Guide · Regulation · Checklist · Case · Tool**.

### 5.2 Behaviour

- **Directory is the default view**, especially on phones. **Map** is a toggle showing the same data as the branching tree.
- The directory is searchable, uses full readable labels and expands one branch at a time.
- Each branch has a stable anchor so the home page can deep-link to it.
- The map uses short labels (four words or fewer at the top two levels) and shows the full label on selection.

### 5.3 Implementation notes

- The existing "1:1 Outline" view in `components/bitemporal/osint-knowledge-tree.tsx` is the starting point for the directory. Make it the default and restyle it as folder rows.
- Generate the directory and its coverage badges from compiled corpus data so labels cannot go stale. This replaces the hard-coded "Queued" badges in `lib/corpus/knowledge-tree.ts`.
- Use one taxonomy for both audience modes. Mode changes the wording of descriptions, not the shape of the tree.
- Remove the crosswalk table and lexicon grid from `/explore` and link to their dedicated pages.
- The diagnostic-code and C.F.R. jump directories planned in `E9-S4` become deeper levels of this directory, so one build serves browsing and crawl depth.

---

## 6. Header

### 6.1 Changes

- **Disclaimer tier:** shorten to "Educational reference only. Not legal advice." plus the existing cautions link.
- **Nav tier:** the six items from section 3.2; on phones, collapse to a menu button plus search.
- **Era tier:** on narrow screens, collapse to one chip, "Law as of: Today ▾", which opens the full era selector, date input and milestones in a sheet. On desktop, keep the ribbon but consider showing it expanded only on date-sensitive routes (`/cfr`, `/cases`, `/eras`, `/timeline`) and as the chip elsewhere.
- Keep the selected date visible at all times, in the chip, so the temporal context is never hidden.

### 6.2 Acceptance criteria

- At 390px wide the sticky header takes no more than about 120px.
- At 320px wide (400% zoom) at least half the viewport height remains for content.
- Existing zero-overflow and accessibility checks still pass.

### 6.3 Governance

This changes ADR-0006 Decision 1, which requires the persistent three-tier ribbon on every page and was approved on 2026-11-16. It needs a new ADR that amends it. The narrowest amendment is the mobile collapse alone; the desktop route-specific behaviour is optional and can be decided separately.

---

## 7. Visual system

### 7.1 Colour

- **Light mode:** keep warm ivory and white surfaces. Move body text from navy-black to charcoal.
- **Dark mode:** replace navy surfaces with charcoal and warm grey. Keep a soft blue for links only.
- **Navy:** reserve for text links, the active nav item and selected controls.
- **Primary button:** use the existing bronze/ochre accent for the single main action on a page.
- **Illustration palette:** ivory, charcoal, muted sage and ochre. These stay decorative.
- **Status colours:** coverage states, quarantine stripes and diff colours keep their current meanings. No decorative colour may reuse them.

Suggested dark-mode starting values, to be contrast-checked by QA before adoption:

| Token | Current | Suggested |
|---|---|---|
| `--background` | `#0d131f` | `#17181a` |
| `--surface` | `#131c2e` | `#1f2023` |
| `--surface-elevated` | `#182338` | `#26282c` |
| `--muted` | `#1f2d45` | `#2e3035` |
| `--border` | `#2c3d59` | `#3a3d42` |
| `--foreground` | `#f1efe9` | `#ecebe6` |
| `--muted-foreground` | `#bac5d6` | `#b5b3ab` |
| `--primary` | `#93c5fd` | `#9db8dc` |

### 7.2 Typography

- Load Newsreader, Geist and Geist Mono with `next/font`. This is a small change with a large visual effect.
- Explanatory prose at 16–18px with comfortable line spacing.
- Reading column of about 65–75 characters.
- A 13px floor for metadata and citations; remove 9–11px text.
- Monospace only for citations, codes and dates.

### 7.3 Layout and components

- Use cards for the four home gateways and for genuinely separate objects.
- Use headings, whitespace and plain rows for directories, lists and related links.
- One primary action per page.
- Add a favicon and a simple wordmark.

### 7.4 Copy

| Current | Replace with |
|---|---|
| Active Bookmark: W5 · 111 Live Modules Pulled | (footer) "111 source documents, checked 2026-…" |
| Live Wave 1 Tracer Bullet: … | Remove from home |
| Open Full 3-Column Playbook 01 | Read the guide |
| Open 3-Column Playbook & Provenance Reader | Read the guide |
| Morph Tree by Decision Date | Show the law as of |
| 1:1 Outline / Interactive Tree | Directory / Map |
| 15 VASRD Body Systems (/vasrd) → | Disability ratings |
| Source provenance panel headings | Sources and limitations |

Headings carry one idea each. Citation-heavy detail appears after the visitor enters a page, not on the gateway to it.

---

## 8. Destination pages

- **Cases:** compact result rows, a visible result count, pagination or incremental loading, and holdings and source detail behind an expander.
- **Investigate:** short stages with a progress indicator. Keep "I'm not sure". End with three blocks: What you know, Records to find, Questions to discuss. All state stays in browser memory, as now.
- **Readers (playbooks, docs, checklists, eras):** one dominant reading column, collapsible contents on phones, and source detail in a secondary panel. Coverage and date cautions stay visible.
- **Explore/Browse:** one job, per section 5.
- **Mobile testing:** add a check for remaining usable reading height to the existing overflow and accessibility checks.

---

## 9. Backlog changes

### 9.1 Proposed simplification epic (before Epic 6)

| Story | Scope |
|---|---|
| UX-S1 | Load fonts, raise type sizes, neutral dark theme, navy and accent rules, favicon |
| UX-S2 | New home page per section 4, including the two routing fixes |
| UX-S3 | Task-based navigation and Reference menu |
| UX-S4 | Compact mobile header and era chip; ADR amending ADR-0006 |
| UX-S5 | Browse directory as default view of `/explore`, data-driven badges, crosswalk and lexicon removed from the page |
| UX-S6 | Copy scrub of build vocabulary across public pages |
| UX-S7 | Cases pagination and compact rows; Investigate stages and summary |
| UX-S8 | Four home illustrations integrated, with dark-mode check |

Adding these requires updating `BACKLOG.md` and `PLAN.md` in lockstep.

### 9.2 Adjustments to existing stories

| Story | Adjustment |
|---|---|
| `E5-S3` historical extraction | Pair each new section with a clear reader and comparison view |
| `E5-S4` / `E5-S5` overlays | Author overlays for the subjects promoted on the home page first, then the rest |
| `E5-S6` investigation expansion | Add staged question groups and the concise results summary while adding pathways |
| `E6-S1` finality flowchart | Build after the finding and reading paths are simpler; give it its own destination and feature it from Browse |
| `E6-S2` full-corpus tree | Pull the directory and coverage-data work forward into UX-S5; treat the graph as a second view of the same model, with short labels |
| `E6-S3` timeline | Build as the single home for timeline content; retire the home page rail |
| `E7-S3` milestone audit | Include navigation, mobile header and long-page behaviour |
| `E8` research chat | Keep deferred; improve ordinary search first with the same index work |
| `E9-S2` social images | Reuse the illustration set |
| `E9-S4` HTML directories | Pull the human-facing directory forward with Browse; keep crawlability requirements |

### 9.3 Documents that need matching updates when this is adopted

- `vision.md` § 2 (header budget and home composition).
- `.agents/rules/04-calm-craft-and-accessibility.md` § 1 (header budget).
- ADR-0006 (amended by a new ADR).
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` wherever routes, nav or the home page are described.

---

## 10. Artwork

### 10.1 Style and revisions

Every block below is a complete, standalone prompt. Copy the whole block; the shared style instructions are already included at the beginning of each one.

The supplied examples establish a useful palette and paper texture. Keep those qualities, but correct the unclear symbols: visibly connected folder branches, recognisable calendar grids, pale book pages, orderly crosswalk connections, and a form decoder that suggests finding an explanation rather than unlocking a document. Keep the folder-and-magnifier and checklist concepts, with clearer proportions.

The earlier shared instructions conflicted with several subjects: "at most three large simple shapes" could not describe four folders, and "no decorative lines" could suppress the necessary tree connectors or calendar marks. The revised style permits the structural lines and page marks explicitly requested in each subject, while excluding extra ornament. No human figures are needed. The page title supplies the precise legal meaning; the illustration previews the kind of resource.

### 10.2 First four (home gateways)

#### Browse topics

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

A simple computer folder tree: one large charcoal folder on the left, three smaller folders stacked vertically on the right. Connect the parent folder's right edge to one vertical trunk in the gap, then three short horizontal branches that touch the left edge of each child folder. All four folders and every connection must be visible. Use sage and ochre for the child folders. No floating or disconnected branches; no crossing lines.
```

#### Disability ratings

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

A charcoal clipboard with a small plain clip and a pale ivory sheet. On the sheet, three horizontal ochre bars share the same left edge and increase evenly in length from top to bottom. Place one small vertical sage notch on a short horizontal scale beneath the bars. Make this look like an assessment chart on paper, not a menu icon. No checkmarks, medical symbols, body silhouettes, scores or percentage signs.
```

#### Investigate a decision

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

An open charcoal file folder holding one pale ivory document with three short sage horizontal lines. An ochre magnifying glass overlaps the upper-right part of the document. The lens opening reveals the ivory paper and one document line beneath it; it is not filled solid charcoal. Keep the complete circular lens and short handle within the frame. The folder, document and magnifier should all be recognisable at a small size.
```

#### Law and cases

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

One open reference book with a thin charcoal cover, two pale ivory pages, a clear central crease and three short sage lines on each page. A small ochre calendar card sits beside its lower-right corner, overlapping only a little. Give the calendar two simple binding tabs and a visible two-by-three grid of empty square date cells. The book is the main object. No black page interiors, blank sticky notes, tent-shaped desk stands, gavels or scales.
```

### 10.3 Later additions

#### Guides

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

An open practical handbook with a charcoal cover and pale ivory pages. Three small sage index tabs project from the right edge. On the right-hand page, three empty ochre square checkboxes each sit beside one short sage horizontal line. Give the left-hand page two simple horizontal lines. The book should read as a usable guide or checklist, with a visible central fold. No completed ticks, approval stamps or solid dark pages.
```

#### Survivor benefits

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

A charcoal family-records folder holding two overlapping pale ivory document cards, each with two short sage lines. One simple ochre arch curves above and around the folder like a protective canopy, with open space between the arch and the papers. A quiet symbol of care for family records. No house, roof, chimney, heart, wings, memorial imagery or money; this should not look like a housing-benefits icon.
```

#### Timeline

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

Three small calendar cards arranged left to right with clear gaps and their bottom edges aligned. Each has a pale ivory face, a coloured top binding strip and a visible two-by-three grid of empty square date cells. The strips are charcoal, sage and ochre in that order. One thin straight horizontal line runs beneath the cards, with three short vertical stems connecting it to their bottom edges. No overlapping cards, luggage-tag holes, paper clips, loose strings or extra branches.
```

#### Crosswalk

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

A tidy three-column correspondence diagram containing exactly six small index cards, two aligned rows of three. Left-column cards are charcoal, middle-column cards sage, right-column cards ochre. Each card has one short ivory horizontal mark. Join matching cards across each row with straight horizontal connectors visible only in the gaps. Two orderly parallel paths show the same item carried across three versions. No diagonal connections, crossing threads, tangled string, arrows, road markings or extra cards.
```

#### Forms decoder

```text
Minimal flat cut-paper icon on a plain warm ivory background, using only charcoal, muted sage and ochre, with ivory for paper. Fine paper texture, shallow layers, soft subtle shadows; front view, no dramatic perspective. One clear symbol centred within a square 1:1 image, occupying about 70% of the canvas with generous margins. Include only the structural lines and page marks requested below. No text, letters, numbers, plants, people, seals, extra ornaments or border. Keep every part fully inside the frame.

One pale ivory form sheet backed by a thin charcoal edge, with three simple sage outlined rectangular fields. Highlight the middle field with a pale ochre fill. A small sage explanation card sits to the right, containing two short charcoal lines; one short horizontal connector links the highlighted field to this card. A clear form-field-to-explanation diagram. No key, keyhole, lock, magnifying glass, cut-out slots or oversized empty box.
```

### 10.4 Production notes

- Generate the set in one session and reject any image that drifts in scale or palette.
- Set the generator's aspect-ratio control to square 1:1 as well as including it in the prompt. Keep the same output dimensions for the whole set.
- Once one image is right, attach it as a style reference for the rest ("same style, palette and scale as this image").
- Judge each image at tile size (about 120px wide), not full size. If it is not readable at a glance there, it has too many parts.
- Check the requested geometry: tree branches touch their folders; book pages are pale; calendars have date-cell grids; crosswalk rows connect without crossing. Reject decorative additions and cropped handles or folder edges.
- Many generators do not produce true transparency. Generate on solid ivory, remove the background afterwards, and check each image on the dark theme.
- Keep titles as real page text, never inside the image.
- Avoid flags, eagles, medals, seals, money and anything implying approval or a successful outcome. The site must not look official.
- Illustrations are decorative: empty `alt` text, with the gateway title carrying the meaning.
- Use one icon family (the existing Lucide set) for small icons in directories and tools.

### 10.5 Visual audit of supplied `docs/ux/*.jpeg` candidates (2026-11-17)

| Subject | File | Verdict | Notes for `E10-S4` / `E11-S4` |
|---|---|---|---|
| Browse topics *(Gateway 1)* | `browse-topics-folder-tree.jpeg` | **Keep** | Clean centered trunk to 3 child folders; reject `browse-topics-folder-tree-alternate.jpeg` (top ochre folder disconnected). |
| Disability ratings *(Gateway 2)* | `disability-ratings-clipboard-chart.jpeg` | **Keep** | Clean clipboard, 3 progressive ochre bars, charcoal scale with sage notch. |
| Investigate a decision *(Gateway 3)* | `investigate-decision-folder-magnifier.jpeg` | **Keep** | Open lens reveals ivory paper and middle sage line; reject `investigate-decision-folder-magnifier-alternate.jpeg` (opaque dark lens). |
| Law and cases *(Gateway 4)* | `law-and-cases-book-calendar.jpeg` | **Keep** | Pale ivory pages, 3 sage lines per page, ochre calendar grid at lower right. |
| Guides *(Secondary)* | `guides-tabbed-manual-checklist.jpeg` | **Keep** | 3 sage right-edge tabs and 3 empty ochre checkboxes; reject `guides-tabbed-manual-checkmarks-alternate.jpeg` (top motion-blur ghost + dark checkmarks). |
| Forms decoder *(Secondary)* | `forms-decoder-field-explanation.jpeg` | **Keep** | Highlighted middle field linked to sage explanation card; reject `forms-decoder-form-key-alternate.jpeg` (literal key metaphor). |
| Survivor benefits *(Secondary)* | `survivor-benefits-family-records.jpeg` | **Keep** | Folder + two angled ivory cards under ochre arch (smooth minor dark-pocket banding on WebP export). |
| Crosswalk *(Secondary)* | `statutory-crosswalk-linked-cards.jpeg` | **Regenerate / clean** | Style-reference bleed inserted a middle row of 3 calendar grids between the two linked 3-card rows. |
| Timeline *(Secondary)* | `timeline-calendar-cards.jpeg` | **Regenerate / clean** | Style-reference bleed added the ochre arch above the 3 calendars and a grey pedestal below the timeline bar. |

> **Dark-mode matting rule:** Never apply global ivory chroma-key removal (which punches holes through pale ivory book/clipboard pages). Use contiguous corner-seeded exterior flood-fill or intentional rounded archival bookplate wells verified on `#17181a` neutral charcoal dark mode.

---

## 11. Suggested order of work

1. UX-S1 and the two routing fixes (small, visible, no governance change).
2. UX-S6 copy scrub.
3. UX-S2 home page and UX-S3 navigation together.
4. UX-S4 header, with its ADR.
5. UX-S5 Browse directory.
6. UX-S7 Cases and Investigate.
7. UX-S8 artwork, once the gateways exist to hold it.

---

## 12. Where the two reviews differed

| Topic | Claude Code's first view | ChatGPT's view | Resolution |
|---|---|---|---|
| Number of home gateways | Six tiles | Four gateways plus direct links | Four. Fewer is the point. |
| First gateway | Investigate | Browse | Browse. Investigate's coverage is still Wave 1 only. |
| Directory | A separate `/browse` page from `E9-S4` | Directory as the default view of `/explore`, map as the alternative | ChatGPT's. One page, two views, and the outline view already exists. |
| Art palette | Navy ink engraving with per-section accents | Cut-paper in ivory, charcoal, sage and ochre | ChatGPT's. Navy art would add to the blue. |
| Per-section identity colours | Six muted colours | Not proposed | Dropped. They would compete with status colours. |
| Fonts and missing assets | Flagged | Not mentioned | Kept (section 7.2, 7.3). |
| Mobile header, page lengths, stale tree badges | Not measured | Measured from the render | Adopted; badge and pagination findings confirmed in code. |
| Era bar | Chip on most routes | Collapse on narrow screens | Mobile collapse is the required part; desktop behaviour is optional. |
