# Rule 02: Bitemporal Legal Engine, Provenance & Citation Precision

1. **Publication Date vs. Effective Date Separation:**
   - Federal Register **Publication Dates** routinely precede **Effective Dates** by 30–180 days (e.g., `38 C.F.R. § 4.56` published June 3, 1997 at `62 FR 30235`, *effective* July 3, 1997).
   - Every date resolver in `lib/corpus/` MUST evaluate `effective_from <= decision_date <= effective_to`, never `publication_date`, and UI views must display both dates distinctly alongside `applicability_and_transition_notes` (*Karnas* pending-claim rules vs. prospective-only floors).

2. **Two-Pane Bitemporal Presentation (`T₀` vs. `T_now`):**
   - Selecting a historical **Decision Date** must never naively hide all post-decision law. Present two distinct panes:
     - **Pane 1 ("Text & Rules in Force Then" — `T₀`):** Contemporaneous `38 C.F.R.` text, era-accurate Title 38 statutory numbers (`1933 Vet. Reg. 1(a)` <-> `1958 Pub. L. 85-857` <-> `1991 Pub. L. 102-40 / 102-83`), and era-specific record-scope rules (e.g., pre-July 21, 1992 absence of *Bell* constructive possession; pre-March 24, 2015 `§ 3.157(b)` hospital-report claims).
     - **Pane 2 ("How Later Developments Affect This Research Today" — `T_now`):** Modern reopening/reconsideration vehicles (`§ 3.156(c)`, *Brown* void reductions, *Lang* `§ 3.156(b)`, *Hamill* `§ 5104(b)`, *Nehmer* `§ 3.816`) contrasted with collateral CUE bars under *George v. McDonough*, `596 U.S. 740 (2022)` and `38 C.F.R. § 20.1403(e)`.

3. **Banned Marketing Claims & Precision Scope Labels:**
   - **Never** render slogans like `"100% verified"`, `"zero hallucination"`, or `"CUE Safe"`.
   - State the exact legal proposition established (e.g., `"No § 20.1403(e) Change-in-Interpretation Bar — Undebatable Error & § 4.25 Manifest Outcome Change Still Required"`).
   - State `38 C.F.R. § 20.1409(c)` accurately as **one final merits CUE decision per prior Board decision on an issue** (excluding without-prejudice pleading dismissals under `§ 20.1404`)—never as a blanket `"one lifetime Board CUE"` rule.

4. **`CAVC Rule 30(a)` & Unfinalized Rule Quarantine:**
   - Never cite a single-judge CAVC memorandum decision (`mem. dec.`) without an explicit `nonprecedential (CAVC Rule 30(a))` label.
   - Quarantined proposed rules (`RIN 2900-AQ72`, `RIN 2900-AQ73`, `RIN 2900-AQ82`, `90 FR 46542`) and rescinded IFRs (`91 FR 7118`, rescinded `91 FR 9712`) must carry unmistakable caution striping (`Proposed / Not Enacted Law` or `Rescinded`) so neither veterans nor practitioners ever cite them as active regulations.
