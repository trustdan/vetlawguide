**Verdict:** the foundation is right, but the plan spends its effort on chrome and visualizations rather than on the one thing nobody else has, the point-in-time CFR reader. I'd make VetLawGuide a practitioner reference first, with a plain-English layer on top.

## What's right

- **Build-time compile from a single source repo, static output, no database.** This is the right fit for a small deterministic corpus.
- **Publication date vs. effective date as separate fields, and the quarantine of proposed rules.** These are the real differentiators, and they are already in the data.
- **A client-side screener with no data leaving the browser.**

## Where I'd push back

1. **Era Goggles promise more than the corpus can deliver.** A global date selector implies every section resolves correctly for any date. You have about 17 snapshots, and some versions are flagged `summary-only`. A silent fallback to the wrong text is exactly the failure this site exists to prevent. I'd change three things:
   - Every view states its coverage: verbatim-verified for this date, summary only, or no snapshot (do not rely).
   - The linter fails the build on gaps or overlaps in any section's version chain.
   - The control is labeled "decision date", since that's what it is.

2. **Veteran mode is a second product, not a toggle.** It needs 100+ newly written summary blocks and a different navigation. It also carries most of the legal exposure: directive callouts like "stop before filing" and a fact-driven veteran screener edge toward applying law to facts. I'd make plain English a block at the top of each page, written first for the 15–20 highest-traffic modules. I'd keep the veteran screener to a records-request checklist. The accreditation and unauthorized-practice line is your call as the attorney.

3. **The three-tier header is too much.** It costs about 150px of persistent chrome, and the fisheye rail is hover-driven, which fails on touch and for the older and disabled users you name. I'd collapse the goggles to a date chip in the nav and keep the rail on `/timeline`.

4. **The knowledge tree is a showcase, not navigation.** The OSINT framework works because its taxonomy is a strict tree with external links as leaves. Yours is a graph of about 125 modules with many tags each, so the four "pivots" are really faceted filters. Your mobile fallback, an accordion, is the actual navigation, so build that first. The one diagram that earns its place is the piercing-finality flowchart, hand-laid-out. If you still want the tree later, plain SVG with `d3-hierarchy` is enough; React Flow is for editable canvases.

5. **Trust is asserted, not shown.** `verification_status` has one possible value, so it carries no information. I'd replace it with who verified each module, when, and against which GovInfo or Federal Register URL, and show that on the page. I'd also drop "zero-hallucination" from the copy; visible sourcing is the stronger claim. Two related gaps:
   - **Currency:** nothing in the plan watches for new rules. A scheduled Federal Register API check for Parts 3, 4 and 20 that opens an issue would cover it.
   - **Citator badges:** "Active Precedent" is an ongoing maintenance promise, so each badge should carry an "as of" date.

6. **GitHub Issues as the only feedback channel excludes most veterans** and invites public posting of personal data despite the warning. A simple email or form alongside it would fix that.

## How I'd sequence it

1. **Vertical slice:** one section end to end (§ 4.56 or DC 7804) with every era, a redline diff, both dates, source links, a permalink per version, and Playbook 01 linking into it. This proves the pipeline and the core value.
2. **Docs and playbooks reader**, with the citation linker and hover cards.
3. **Full CFR reader and statutory crosswalk**, with the decision-date chip.
4. **Timeline**, including the quarantined-proposals track.
5. **Cases and General Counsel opinions.**
6. **Practitioner screener.**
7. **Plain-English layer and veteran checklist.**
8. **Flowchart or tree, accessibility audit and polish.**

Two technical notes:

- **Mode toggle:** render both audiences' content in the HTML and switch with a CSS attribute set by an inline script. Keep `?mode=` out of canonical URLs.
- **Versions:** give each CFR version its own static, citable URL, and have `?date=` resolve to one of them. Lawyers will want to cite a version, not a query string.

If it's useful, I can turn this into a revised `vision.md` or a spec for the vertical slice.