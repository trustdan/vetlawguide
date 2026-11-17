# VetLawGuide — Data Corpus Specification & Architecture Prompt Brief

> **Purpose of this Document:** Copy or upload this brief directly into Claude, ChatGPT, or other LLMs to solicit their best software, UX, and information-architecture recommendations for **VetLawGuide** (`vetlawguide.com`). It documents (1) the exact structure, schemas, and legal mechanics of the underlying knowledge repository (`VA-law-planning`), (2) existing UI/UX assets and patterns from a sibling production prototype (`WK-private-demo`), and (3) the product vision and open architectural questions.

---

## 1. Executive Summary of the Source Knowledge Repository (`VA-law-planning`)

`VA-law-planning` is a strictly typed, primary-source-verified, machine-queryable **Veterans Law Reference Library & Retroactive C-File Screening Knowledge Base** focused on Title 38 of the U.S. Code (`38 U.S.C.`), Title 38 of the Code of Federal Regulations (`38 C.F.R.`), the VA Schedule for Rating Disabilities (`VASRD`, `38 C.F.R. Part 4`), Title 10 military retiree intersections (`CRSC`/`CRDP`), and controlling precedent from the U.S. Supreme Court, Federal Circuit, Court of Appeals for Veterans Claims (`CAVC`), and binding VA General Counsel Precedent Opinions (`VAOPGCPREC`).

### Core Legal Thesis
Every high-value retroactive recovery (or accurate historical analysis) in Veterans Law requires pairing two orthogonal axes:
1. **A Procedural Vehicle that Pierces or Bypasses Finality** (e.g., `38 C.F.R. § 3.156(c)` newly associated official service department records, `§ 3.344` void *ab initio* rating reductions, *Nehmer* `§ 3.816` herbicide class rules, `§ 3.156(b)` *Lang* 1-year VAMC records abating legacy finality, pre-2015 `§ 3.157(b)` automatic hospital-report claims, post-2019 AMA `§ 5104(b)` *Hamill* explicit-notice omissions, RO Clear and Unmistakable Error [`CUE`, `§ 3.105(a)`], or one-shot Board CUE [`§ 7111`]).
2. **The Exact "Law of the Era" in Force on the Historical Decision Date** — verbatim historical `38 C.F.R.` text, contemporaneous Diagnostic Code (`DC`) criteria, pre-1991 or pre-1959 statutory section numbers, and era-specific evidentiary rules.

### Scale & Verification Status
* **Current State (`knowledge/index.json`, Schema v2.0):** **67 `100%` primary-source-verified Markdown modules** + **65+ structured Federal Register regulatory version records** (`knowledge/cfr-amendments.json`, ~1,000 lines).
* **Active Expansion Trajectory (`BACKLOG.md`, 10 Epics):** 6 of 10 Epics are already complete (`EPIC-00`, `01`, `02`, `04`, `05`, `08`), with `EPIC-03`, `06`, `07`, and `09` actively expanding the corpus to **`~105–125+` primary-source-verified modules** covering all **15 VASRD Body Systems (`DC 5000–9918`)**, effective dates, back-pay offsets/recoupment, debt waivers, BVA/CAVC litigation, `§§ 1725/1728` emergency medical reimbursements, `Ch. 31` VR&E, and `§ 5904` / EAJA fee practice.
* **Scope Boundary:** Scoped strictly to matters a Veterans Law practice evaluates, litigates, or defends (compensation, DIC/survivors, discharge bars, SMC/ancillaries, offsets, emergency medical reimbursement, VR&E, appeals, debt defense). Routine non-litigated admin topics (VA home loan underwriting, burial logistics, routine VHA copays) are intentionally excluded.

---

## 2. Content Taxonomy & Directory Architecture (Strict Diátaxis Separation)

The knowledge repository enforces **Diátaxis Mode Purity** and **Single Source of Truth (`SSOT`)** across six content directories—meaning prose strategy is never mixed into verbatim regulatory snapshots, and verbatim `38 C.F.R.` text lives in exactly one canonical place:

| Directory | Category Enum | Current -> Target Count | Cognitive Role & Contents |
| :--- | :--- | :---: | :--- |
| **`authorities/`** (`part-3/`, `part-4/`, `part-20/`) | `authority-snapshot` | `17` -> `~30` | **Primary-Source Verbatim CFR Snapshots (SSOT):** Exact multi-era verbatim `38 C.F.R.` text blocks pulled from GovInfo, eCFR, and historical Federal Register volumes (1946–2026). All other files *link* here rather than paraphrasing CFR text that could drift. |
| **`cfr-diffs/`** (`part-3/`, `part-4-policy/`, `vasrd/`, `part-20/`) | `cfr-diff` | `11` -> `~24` | **Historical Regulatory Evolution & Temporal Traps:** Era-by-era diffs across Part 3 adjudication rules, Part 4 Subpart A General Rating Policy (`§§ 4.1–4.31`), and all 15 VASRD Body Systems (`DC 5000–9918`), highlighting what changed, when, and what CUE/pending-claim traps exist. |
| **`eras/`** | `era-lens` | `5` -> `5` | **Decadal "Law of the Era" Lenses (1945–2026):** Five complete chronological regimes (`1945–1961` Post-WWII/Korea, `1962–1988` Pre-VJRA Closed Era, `1988–2000` VJRA Revolution, `2000–2018` VCAA Legacy Modernization, `2019–2026` AMA/PACT Modern Era). |
| **`docs/`** | `doctrine` | `8` -> `~13` | **Core Legal Treatises, Matrices & Crosswalks:** Cross-era syntheses including Procedural Vehicles for Piercing Finality, Master Chronological Matrix (1945–2026), Three-Era Title 38 Statutory Crosswalk (`1933 Vet. Regs.` <-> `1958 Pub. L. 85-857` <-> two-step `1991` renumbering), Master Binding `VAOPGCPREC` Digest (active vs. withdrawn/superseded), Historical VA Forms & Rating Code-Sheet Lexicon (`8-526` to `10182`, bilateral math, SMC codes), Complete `SMC(k)–(t)` Treatise & *Barry* Step Math, Service Connection/Soundness/Aggravation Treatise, and Citation Verification Log. |
| **`playbooks/`** | `playbook` | `19` -> `23` | **Issue-Spotting & Litigation Playbooks ("C-File Goldmines"):** Numbered Design-by-Contract guides (e.g., *01: 0% Scar vs. Muscle Group Injury*, *02: Wrong-Address Mailings & C&P No-Shows*, *03: Newly Associated Service Records § 3.156(c)*, *04: Unadjudicated TDIU/Informal Claims/SMC*, *05: Void Rating Reductions*, *06: Nehmer & CRSC Soto*, *08–09: Survivor DIC/§ 1318/Accrued/Substitution*, *10–11: Character of Discharge 2024 Overhaul & Guard/Reserve*, *12–13: SMC(l)-(t) & Ancillaries*, *14–19: Secondary/Obesity, PACT/TERA, PTSD/MST, § 1151 Malpractice, TBI 10-Facet/Nerves, Extraschedular/Temp 100%*). |
| **`checklists/`** | `checklist` | `7` -> `10` | **Operational Screening Protocols & Pre-Filing Gates:** Step-by-step C-file audit protocol, 9-vehicle Retroactive Pathway Comparison Matrix, Mandatory One-Shot `§ 7111` Board CUE Pre-Filing Gate, 48-Hour Survivor Post-Mortem Triage Gate, COD/Guard Intake Gate, 5-Gate SMC & Ancillary Audit Worksheet, and Blank Anonymized Case-Screening Worksheet. |

---

## 3. Machine-Readable Schemas, JSON Indices & Automated Compiler

`VA-law-planning` is already engineered like a compiler-verified static dataset. Zero-dependency Python scripts (`scripts/validate_kb.py` and `scripts/query_rules.py`) parse every Markdown file and JSON ledger, enforce legal-engineering invariants (`tests/test_kb_integrity.py`), and compile `knowledge/index.json`.

### A. Rule Card Frontmatter Schema (`schemas/rule-card.schema.json`, v2.0 -> `knowledge/index.json`)
Every Markdown module carries validated YAML frontmatter compiled into `knowledge/index.json`:
* `id` (`string`, kebab-case unique key) & `title` (`string`) & `path` (`string`)
* `category`: `"doctrine" | "era-lens" | "playbook" | "cfr-diff" | "checklist" | "authority-snapshot"`
* `effective_from`: `YYYY-MM-DD`
* `effective_to`: `YYYY-MM-DD` or `"present"`
* `bitemporal_scope`:
  * `"cue-and-open-claim"` — Unambiguous plain-text rule from inception; safe for both CUE and open claims.
  * `"open-claim-only-george-restricted"` — Later judicial reinterpretation/invalidation; applies retroactively to open/pending/`§ 3.156(c)` claims, **barred in CUE** under *George v. McDonough*, 596 U.S. 740 (2022) & `38 C.F.R. § 20.1403(e)`.
  * `"prospective-liberalizing-3.114"` — Liberalizing statute/regulation governed by `38 U.S.C. § 5110(g)` / `38 C.F.R. § 3.114` effective-date floors.
  * `"mixed-see-text"` — Multi-rule document containing multiple bitemporal regimes.
* `practice_domains` (array of 13 canonical domain enums):
  `finality-and-cue`, `disability-compensation`, `character-of-discharge`, `toxic-exposure`, `vasrd-rating-schedule`, `tdiu-unemployability`, `smc-ancillary`, `survivors-dic-accrued`, `effective-dates-offsets`, `pension-fiduciary-debt`, `appeals-cavc-litigation`, `vre-medical-reimbursement`, `fees-eaja`
* `vasrd_system` (`null` or 16 canonical Part 4 enums):
  `part-4-general-policy`, `01-musculoskeletal`, `02-eye-vision`, `03-auditory`, `04-infectious-immune`, `05-respiratory`, `06-cardiovascular`, `07-digestive`, `08-genitourinary`, `09-gynecological-breast`, `10-hemic-lymphatic`, `11-skin`, `12-endocrine`, `13-neurological`, `14-mental-disorders`, `15-dental-oral`
* `statutes`: `string[]` (e.g., `"38 U.S.C. § 5109A"`, `"Veterans' Regulation No. 1(a)"`, `"10 U.S.C. § 1413a"`)
* `cfr_citations`: `string[]` (current and repealed `38 C.F.R.` sections)
* `diagnostic_codes`: `string[]` (4-digit VASRD codes and ranges, e.g., `"5301-5323"`, `"7800-7805"`, `"8045"`, queryable numerically by range or exact code)
* `key_precedents`: `string[]` (SCOTUS, Fed. Cir., CAVC precedential panels/en banc, and `VAOPGCPREC` citations)
* `retro_pathways` (array of 21 procedural/substantive pathway enums):
  `cue-ro-3.105a`, `cue-bva-7111`, `service-records-3.156c`, `pending-unadjudicated-claim`, `defective-notice-presumption-rebuttal`, `void-rating-reduction`, `nehmer-3.816`, `ama-explicit-notice-5104b`, `ama-continuous-pursuit-3.2500`, `crsc-soto-settlement`, `direct-or-secondary-sc`, `presumptive-sc-3.307-3.320`, `cod-insanity-upgrade-gateway`, `section-1151-malpractice`, `liberalizing-law-3.114`, `increased-rating-lookback-5110b2`, `survivor-dic-1310-1318`, `accrued-substitution-5121`, `smc-statutory-entitlement`, `offset-recoupment-audit`, `cavc-eaja-litigation`
* `c_file_triggers`: `string[]` (Preconditions: exact VA form numbers, legacy Rating Code Sheet shorthand, service medical record acronyms like `"T&T"`, `"SFW"`, `"DD Form 1380"`, `"VA Form 10-7131"`)
* `kill_switches`: `string[]` (Invariants/bars that defeat a legal theory: e.g., BVA subsumption barring RO CUE, `§ 20.1409(c)` one-shot Board CUE res judicata, *Cook* duty-to-assist CUE bar, *Haines* survivor CUE bar, combined-rating table math non-change)
* `unfinalized_proposals`: `string[]` (Quarantined proposed rules / `RIN`s / rescinded Interim Final Rules that must **never** be cited as enacted law, e.g., `RIN 2900-AQ72` tinnitus/sleep apnea, `RIN 2900-AQ73` neurological, `RIN 2900-AQ82` mental health, `90 FR 46542` painful scars, rescinded `91 FR 7118` medication IFR)
* `verification_status`: `"primary-source-verified"` (100% of modules)

### B. Temporal CFR Version Ledger (`schemas/cfr-version.schema.json` -> `knowledge/cfr-amendments.json`)
A structured JSON array of point-in-time `38 C.F.R.` versions enforcing strict temporal hygiene:
* `version_id`, `cfr_section`, `heading`
* `regulatory_status`: `"final-effective" | "repealed-historical" | "proposed-nonbinding" | "interim-final-rescinded"`
* `federal_register_citation`, `publication_date` (`YYYY-MM-DD`), `effective_from` (`YYYY-MM-DD`), `effective_to` (`YYYY-MM-DD | "present"`) — **crucial because FR publication dates routinely precede effective dates by 30–180 days!**
* `supersedes` / `superseded_by` (doubly-linked version chain IDs)
* `applicability_and_transition_notes` (pending-claim *Karnas* rules, explicit non-retroactivity floors, statutory overrides)
* `verbatim_text_status`: `"verbatim-govinfo-ecfr" | "verbatim-federal-register" | "summary-only-pull-print-cfr-before-cue"`

### C. Structured Case-Screening Schema (`schemas/case-screen.schema.json`)
A computable intake/decision-tree JSON Schema modeling anonymized claim screening (with strict Zero-PII rules):
* `veteran_profile` (`service_eras`, `combat_indicator`, `purple_heart_or_combat_badge`, `pow_status`, `retiree_status`, `toxic_exposure_zones`)
* `target_issue` (`disability_description`, `diagnostic_codes_historical`, `diagnostic_codes_current`)
* `claim_and_decision_timeline` (`earliest_possible_claim_date`, `challenged_decision` [`AOJ-RO` vs. `BVA` + dates], computable `notice_events` mailing regularity audit, `service_records_added_after_denial`)
* `finality_and_record_scope` (`decision_finality_status` [7 states], `bva_subsumed`, `prior_bva_cue_decided_on_merits`, `implicit_denial_regime`, `record_scope` [pre- vs. post-July 21, 1992 *Bell* constructive possession])
* `retroactive_vehicle_candidates` (`primary_title38_vehicle`, 5-point `cue_gate_check`, `ancillary_and_cross_system_multipliers` [`SMC(k)/(l)/(s)`, *Barry* multi-step bumps, Title 10 DoD CRSC *Soto* arrears])
* `verification_gates` (5 mandatory pre-filing boolean checks)

### D. Automated Integrity & Legal Policy Linter (`scripts/validate_kb.py`)
Every build verifies:
1. Schema v2.0 frontmatter validity & valid date ranges across all directories.
2. Zero broken internal Markdown links and **zero orphan modules** in the citation graph.
3. **`CAVC Rule 30(a)` Precedential Lint:** Fails build if any single-judge `mem. dec.` is mentioned without an explicit nearby `"nonprecedential"` / `"Rule 30(a)"` qualifier.
4. **Proposal / Rescinded IFR Quarantine Lint:** Fails build if quarantined proposed `RIN`s or rescinded IFRs appear anywhere without explicit `"proposed / not finalized"` or `"rescinded"` qualifiers.
5. **Zero-PII Guard:** Scans for SSN patterns (`DDD-DD-DDDD`) and blocks any client PII from ever entering Git.

---

## 4. Unique Domain Nuances the Website Architecture Must Support

1. **Bitemporal "Time-Travel" Lookup ("Putting on Time-Period Goggles"):**
   If a user inspects VA law through the lens of **August 12, 1974** (or the `1962–1988` Era):
   * `38 C.F.R. § 4.56` (muscle injuries) must display its **pre-July 3, 1997** verbatim text, not today's eCFR text.
   * Statutory links must resolve **1959–1991 Title 38 section numbers** (`former 38 U.S.C. § 310` -> `§ 1110`; `former § 3010` -> `§ 5110`; `former § 211(a)` judicial review bar), while pre-1959 dates resolve `Veterans' Regulation No. 1(a)`.
   * Post-1974 rules (e.g., July 21, 1992 *Bell* constructive possession, Nov. 21, 1997 BVA CUE statute, Feb. 19, 2019 AMA explicit-notice rule) must visibly signal whether they apply retroactively to an open 1974 claim vs. being barred in CUE under *George v. McDonough*.
2. **One Canonical Truth, Two Radically Different Audiences (Veterans vs. Lawyers):**
   * **Veterans** need clear, empathetic, plain-English explanations: *"What does a 0% scar rating on a shrapnel wound mean? What paperwork in my file matters? Why shouldn't I file a Board CUE motion lightly (you only get one shot ever)? What should I ask an accredited VSO or attorney?"*
   * **VA Law Practitioners (Attorneys, Agents, VSOs, Law Clerks)** need rapid, high-density technical precision: verbatim historical CFR pin-cites, Federal Register publication-vs.-effective date splits, `VAOPGCPREC` citator status, `bitemporal_scope` flags, `§ 4.25` / `§ 4.26(d)` / *Barry* `§ 3.350(f)` step math, legacy code-sheet decoders, and fatal `kill_switches`.
   * **Crucial Constraint:** Dual-audience presentation **must not** break Single Source of Truth (`SSOT`) by duplicating regulatory text into two drifting prose trees.
3. **Quarantine of Proposed Rules vs. Enacted Law:**
   Veterans online are routinely misled by rumors about proposed VASRD changes (e.g., `RIN 2900-AQ72` CPAP sleep apnea / tinnitus proposals, `90 FR 46542` painful scars, or the 10-day Feb. 2026 `§ 4.10` medication IFR rescinded at `91 FR 9712`). The UI must visually distinguish **Active Law**, **Repealed Historical Law (Still Live for Retroactive Audits)**, and **Unfinalized Proposals / Rescinded Rules**.

---

## 5. Product Requirements, Design Vision & Existing Tech Assets

### Required UX & Functional Pillars
1. **Prominent Top Disclaimer:** An unmistakable, always-accessible top banner/notice stating that **nothing on VetLawGuide constitutes legal advice** (nor creates an attorney-client relationship), paired with cautions around high-stakes irreversible actions (like one-shot `§ 7111` Board CUE motions).
2. **Prominent Top Audience Toggle (`Veterans` on the Left <-> `Lawyers / Practitioners` on the Right):** A signature, sleek top-of-site mode switch that adapts explanations, terminology density, callouts, and navigation workflows to the active persona.
3. **Interactive Knowledge Tree (Like `osintframework.com`, But Modern & Beautiful):** A visual, zoomable/collapsible node-and-branch exploration tree allowing users to visually traverse Title 38 domains, procedural finality pathways, all 15 VASRD body systems, Diagnostic Codes, and C-file playbooks without getting lost in walls of text.
4. **"Time-Period Goggles" Interactive Timeline of Veterans Law (`1933 / 1945 – 2026`):**
   * Allows users to scrub through eras and landmark statutory/CFR/judicial inflection points AND "put on the goggles" of a given date or era across the site.
   * **Reference Pattern (`WK-private-demo`):** We already have a proven pattern from a sibling Next.js 16 project featuring:
     * A **desktop horizontal fisheye-magnifying timeline rail** mounted cleanly beneath the primary nav bar (using `motion/react` spring physics: major milestone years stay labeled, intermediate dots smoothly magnify and reveal glassmorphic tooltips on cursor hover).
     * A dedicated **Multi-Track Interactive Timeline page** with sticky track filter pills, color-coded parallel tracks, verification/certainty badges, archival primary-source citation boxes, and "Trap vs. Opportunity" / "Myth vs. Fact" callout cards.
5. **Comprehensive Legal Reference & Documentation Hub:**
   * Clean, readable documentation views for `38 C.F.R.` provisions (with multi-era version switching & historical diffs), Title 38 statutory crosswalks, landmark court cases (SCOTUS, Fed. Cir., CAVC, `VAOPGCPREC`), Era Lenses, Playbooks, and Checklists.
6. **Direct Community Feedback & Issue Reporting:** Prominent link to [`https://github.com/trustdan/vetlawguide/issues`](https://github.com/trustdan/vetlawguide/issues) for questions, citation corrections, or feature requests.
7. **Phased Multi-Epic Delivery:** We are intentionally taking our time—building this iteratively across well-scoped Epics rather than rushing a monolithic MVP.

### Available Tech Stack & UI Assets
* **Hosting & Platform:** **Vercel** (already connected to `github.com/trustdan/vetlawguide`).
* **UI & Motion Assets Available:** Full access to **Magic UI & Magic UI Pro** (`@magicui` and `@magicui-pro` component registries), **shadcn/ui** ("new-york" style), **Tailwind CSS v4**, **Motion v12** (`motion/react`), **Lucide Icons**, **Next.js (App Router)**, **React 19**, and **TypeScript** (all proven together in `WK-private-demo`).

---

## 6. Architecture Questions for Your Recommendation

Based on the data model and product vision above, please provide your best, opinionated architectural blueprint addressing:

1. **Data Pipeline & Repo Topology:** How should the web app (`vetlawguide`) consume and compile `VA-law-planning`'s Markdown modules, YAML frontmatter (`index.json`), and temporal CFR ledger (`cfr-amendments.json`)? (e.g., build-time static compiler/MDX AST pipeline vs. monorepo/submodule sync vs. database/hybrid—keeping zero-drift SSOT and Vercel performance in mind.)
2. **Dual-Persona Architecture (`Veterans` <-> `Lawyers` Toggle):** What is the cleanest content-modeling and UI architecture to power the left/right `Veterans | Lawyers` toggle across 100+ modules **without** duplicating regulatory facts or drifting out of sync?
3. **"Time-Period Goggles" State & Bitemporal UI:** How would you architect the global/contextual temporal lens (URL state, React state, historical CFR version resolution, statutory crosswalk tooltips, and *George v. McDonough* / temporal kill-switch alerts) alongside the `WK-private-demo`-style fisheye nav rail and full multi-track timeline?
4. **The "Prettier OSINT Framework" Knowledge Tree:** What graph/tree visualization library, layout algorithm, and UX interaction pattern (e.g., D3-hierarchy, React Flow / `@xyflow/react`, Cytoscape, custom SVG/Canvas + Motion, Magic UI accents) will deliver the fastest, most legible, mobile-aware interactive legal taxonomy?
5. **Information Architecture, Navigation & Search:** What route structure, documentation layout, cross-linking UX (hover citation cards, split-pane CFR diffs, case citator views), and search/filtering engine (deterministic faceted DC/date/CFR lookup vs. client-side search like Pagefind/Orama vs. optional grounded AI Q&A) best serves both personas?
6. **Design System & Phased Epic Roadmap:** How should we apply Magic UI Pro + shadcn/ui so the site feels sleek, authoritative, and modern (never gimmicky or noisy for older/disabled veterans or busy appellate lawyers), and how would you sequence the build across 6–10 clean Epics?
