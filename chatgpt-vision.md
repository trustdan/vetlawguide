**VetLawGuide has a strong concept. I would build it around one promise: help people connect a VA decision, the law governing it, and the records needed to investigate what happened.** That connection is the most valuable part of your plan—and it should organize the entire experience.

The corpus brief is more compelling than the Antigravity vision. The brief describes substantive research infrastructure; the vision spends too much attention on animated borders, glass panels, and interface components before establishing the research workflow. I would keep its ambition but shift the emphasis toward clear reasoning, inspectable sources, and useful takeaways.

I reviewed both attached documents, not the underlying repository. Its coverage and verification claims therefore remain things to validate.

**My vision is a calm, exceptionally well-sourced veterans-law research desk.**

A veteran should leave understanding their situation better and knowing what to discuss with a representative. A practitioner should leave with a defensible research trail: the relevant authority, its historical version, applicability questions, missing facts, and potential obstacles.

The most important unit of the website would be a **research question**, such as:

- What law governed this rating decision?
- Could this claim still be pending?
- What changes if VA later received service records?
- What records would help investigate this rating?
- Why might this procedural route be unavailable?

The documentation, timeline, tree, and screener would all support answering those questions.

Here is how I would reshape the major features:

| Planned feature | My recommendation |
|---|---|
| Veterans / Lawyers switch | Preserve the two entry points, but let everyone switch between plain-English explanations and practitioner detail. Include agents and VSOs explicitly. |
| Global historical timeline | Keep it as a signature exploration feature; use a compact, explicit date control during research. |
| Interactive knowledge tree | Make it an excellent optional map with an equally capable outline view. |
| Historical CFR reader | Make this a flagship feature, including source scans, pinpoint citations, comparisons, and visible coverage gaps. |
| Case “citator” | Begin with a curated authority directory and documented treatment relationships. Earn the stronger citator claim through maintenance and coverage. |
| Screener | Produce research questions, missing-record lists, and explanations of possible pathways. |
| “100% verified” / “zero hallucination” | Replace with specific, inspectable statements about source checking, legal review, coverage, and freshness. |

**The homepage should begin with the visitor’s problem.**

I would place a substantial search box above a small set of situation-based entry cards:

*Understand a decision · Investigate an older claim · Research a rating · Compare historical law · Explore survivor benefits*

Search should accept ordinary language alongside citations, diagnostic codes, and legacy form numbers. Results should explain why they matched and clearly separate authoritative text, editorial explanation, and practical checklists.

Practitioners could switch to a denser starting view with citation lookup, historical-date selection, recent substantive updates, and saved research items.

Your current navigation—Docs, Tree, CFR, Cases, Screener—describes the website’s components. Situation-based entry points describe what people came to accomplish. Both belong, but the latter should lead.

**The signature experience should be a historical decision workspace.**

Imagine someone investigating a 1974 rating decision. They enter the date, identify the issue, and indicate what they know about the procedural history. “I don’t know” remains a valid answer throughout.

The workspace presents:

| Area | What it shows |
|---|---|
| Research context | Decision date, relevant benefit period, procedural posture, and unresolved facts |
| Historical authority | The applicable source text available in the corpus, with precise version information |
| Possible research pathways | Why each pathway surfaced, what supports investigating it, and what remains unknown |
| Records to locate | Specific documents and why each matters |
| Research packet | Selected authorities, notes, unresolved questions, and a printable representative discussion sheet |

Clicking a pathway should expose its reasoning. A user should be able to see which answer triggered it, which source supports the connection, and which missing fact prevents a stronger conclusion.

That is where this product could become unusually useful.

**The date model needs more precision than one pair of “era goggles.”**

Your proposal recognizes temporal complexity, but a single `?date=` can imply more certainty than the system can justify. At minimum, distinguish:

- The date of the challenged decision.
- The period for which benefits are being evaluated.
- The procedural route being investigated.
- The date through which the research has been checked.

“Show me the text in force on this date” and “determine which law governs this issue” should be separate operations. The latter also requires applicability and transition analysis.

Likewise, later authorities should not simply disappear when someone selects an older date. A later decision may help explain the historical issue, while its use in a collateral challenge requires separate analysis. *George* illustrates this distinction: subsequent invalidation of a VA regulation does not itself establish CUE in a final benefits decision. [supremecourt.gov](https://www.supremecourt.gov/opinions/21pdf/21-234_2b8e.pdf?utm_source=chatgpt.com)

I would give every relevant page two distinct explanations: **“Text in force then”** and **“How later developments affect this research.”**

Also, for reproducibility, record when your system learned or corrected something, separately from when the underlying law was effective. That lets an exported research packet identify exactly which corpus release supported it.

**Trust should come from visible evidence and carefully bounded claims.**

The current verification model needs more granularity. Schema validation, accurate transcription, legal interpretation, and current treatment checking are different accomplishments.

A useful source panel would show:

- Official source and pinpoint location.
- Historical version and effective interval.
- Whether full text or only a summary is available.
- What was checked, when, and by whom.
- Known limitations or unresolved questions.

If the corpus lacks a verified version for a requested date, the page should say so. It should never silently substitute today’s text or the nearest available historical version.

There is already a concrete example of why the summaries need review: the vision describes Board CUE as a “single lifetime” opportunity. Section 20.1409 ties the restriction to a **particular prior Board decision on an issue**, after a final decision on the CUE motion; specified dismissals without prejudice are not final decisions for that purpose. The broad lifetime wording could mislead users. [ecfr.gov](https://www.ecfr.gov/current/title-38/chapter-I/part-20/subpart-O/section-20.1409?utm_source=chatgpt.com)

Similarly, I would remove **“CUE safe”** badges. Temporal compatibility alone does not establish CUE; the regulation also requires a qualifying error and a manifestly different outcome. [ecfr.gov](https://www.ecfr.gov/current/title-38/chapter-I/part-20/subpart-O/section-20.1403?utm_source=chatgpt.com) Use labels that state exactly what has been established.

**Keep one source of authority, but treat plain-English explanation as substantive editorial work.**

The proposed shared authority store is sound. However, keeping two explanations in the same Markdown file does not prevent them from drifting semantically.

I would link individual explanatory propositions to their supporting authority passages. When those passages or their interpretation change, the system should flag dependent summaries, checklists, and screening rules for review.

Audience mode should change the initial presentation, terminology, and density. It should preserve the same sources, qualifications, and uncertainty. A veteran should always be able to inspect the exact authority; a lawyer should always be able to read the plain-English explanation.

**Visually, I would keep the warmth and substantially reduce the movement.**

Warm white pages, dark ink, strong typography, generous spacing, and restrained navy and gold accents fit this project well. Historical comparison views could have an archival character without making ordinary research feel like a themed exhibit.

I would preserve your prominent educational notice and audience control, but collapse the timeline during reading. Three persistent header tiers plus two sidebars could consume too much of the usable viewport.

Reserve motion for opening relationships, changing views, and helping users maintain orientation. Continuously moving borders should not carry legal meaning. Provide keyboard and touch alternatives to every hover interaction, reduced-motion behavior, and a readable single-column layout at high zoom. These choices align with W3C guidance on interaction animation and reflow. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions?utm_source=chatgpt.com)

The knowledge map can still be beautiful. Start with one selected branch, reveal related material progressively, and distinguish relationships such as *amends*, *interprets*, *supports*, and *limits*. A line between two nodes should communicate something specific.

**Technically, I agree with the static-first direction, with a stronger publication boundary.**

Keep the research repository separate. Have it publish a validated, versioned content bundle, and pin the website to an approved release. Each release should include authority text, structured relationships, search data, coverage information, and provenance.

This gives you deliberate publication, reproducible builds, and rollback. Avoid production consuming an unreviewed research branch automatically.

I would also:

- Resolve legal citations to stable authority identifiers during compilation; flag ambiguous references for review.
- Keep exact citation and diagnostic-code lookup deterministic, alongside ordinary text search.
- Put public research-view settings in shareable URLs; keep case-screening answers out of them.
- Use explicit **yes / no / unknown** screening states. Missing information must not become a negative answer.
- Audit network requests and telemetry before claiming screening answers remain on-device. Browser-only computation alone does not establish that guarantee.

An AI assistant can come later. Search, historical comparison, and source-linked explanations should establish the product’s value first.

**I would change the build sequence to prove one complete research journey early.**

| Stage | Deliverable |
|---|---|
| 1 | Source provenance, coverage reporting, publication rules, and accessible design foundations |
| 2 | One complete workflow: situation → historical authority → pathway questions → export |
| 3 | Strong search, documentation, and audience presentation across the verified corpus |
| 4 | Expanded historical comparisons, applicability explanations, and statutory crosswalks |
| 5 | Knowledge map and educational timeline |
| 6 | Broader screening workflows and maintained authority-treatment tracking |

Accessibility and legal review should begin in the first stage. Testing with veterans, VSOs, and practitioners should begin with the second.

For that first complete workflow, I would choose **investigating an older rating decision**. It exercises almost everything distinctive about your concept without requiring you to finish every practice domain.

The launch test I would use is practical: **Can someone find the relevant historical source, understand its limitations, and leave with a useful research packet—without being falsely reassured about what it proves?**