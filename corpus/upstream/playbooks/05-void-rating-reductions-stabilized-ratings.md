---
id: playbook-05-void-rating-reductions-stabilized-ratings
title: "Playbook 05: Void Rating Reductions & Protected/Stabilized Ratings (§§ 3.344, 3.951, 3.957)"
category: playbook
effective_from: "1946-04-01"
effective_to: "present"
bitemporal_scope: cue-and-open-claim
practice_domains:
  - finality-and-cue
  - disability-compensation
  - tdiu-unemployability
  - effective-dates-offsets
  - appeals-cavc-litigation
statutes:
  - "38 U.S.C. § 110"
  - "38 U.S.C. § 1155 (former § 355, 1959–Aug. 5, 1991)"
  - "38 U.S.C. § 1159 (former § 359, 1959–Aug. 5, 1991)"
  - "38 U.S.C. § 1163(a) (former § 363(a))"
  - "38 U.S.C. § 5112(b)(6) (former § 3012(b)(6), 1959–May 6, 1991)"
cfr_citations:
  - "38 C.F.R. § 3.105(d)-(i)"
  - "38 C.F.R. § 3.343(a), (c)"
  - "38 C.F.R. § 3.344(a)-(c)"
  - "38 C.F.R. § 3.951(a)-(b)"
  - "38 C.F.R. § 3.953(a)-(b)"
  - "38 C.F.R. § 3.957"
  - "38 C.F.R. § 20.1403(e)"
diagnostic_codes: []
key_precedents:
  - "Schafrath v. Derwinski, 1 Vet. App. 589 (1991)"
  - "Brown v. Brown, 5 Vet. App. 413 (1993)"
  - "Ternus v. Brown, 6 Vet. App. 370 (1994)"
  - "Kitchens v. Brown, 7 Vet. App. 320 (1995)"
  - "Fenderson v. West, 12 Vet. App. 119 (1999)"
  - "Horn v. Shinseki, 25 Vet. App. 231 (2012)"
  - "Murphy v. Shinseki, 26 Vet. App. 510 (2014)"
  - "Stern v. McDonough, 34 Vet. App. 51 (2021)"
  - "George v. McDonough, 596 U.S. 740 (2022)"
retro_pathways:
  - void-rating-reduction
  - cue-ro-3.105a
  - cue-bva-7111
c_file_triggers:
  - "Any rating code sheet lowering an existing disability percentage (e.g., 50% -> 30%, 100% -> 70%, 30% -> 10%)"
  - "Severance of service connection (<10 years under § 3.105(d) or >=10 years under § 3.957)"
  - "Reduction of a rating in effect for 5+ years based on a single routine C&P examination"
  - "Reduction lacking 60-day advance notice under 38 C.F.R. § 3.105(e) when overall combined payment dropped"
kill_switches:
  - "Staged ratings assigned simultaneously in an INITIAL award are NOT reductions of stabilized ratings (Fenderson v. West, 12 Vet. App. 119 (1999); though watch out where temporary/convalescent vs. stabilized 5-year periods accrued!)"
  - "Reduction of a rating DID NOT reduce total combined monthly compensation (exempts § 3.105(e) 60-day notice, though § 3.344 substantive rules STILL apply if stabilized 5+ years!)"
  - "Proven fraud by the claimant (the sole statutory exception to 10-year § 3.957 and 20-year § 3.951(b) protections, alongside lack of qualifying military service/COD under § 3.957)"
verification_status: primary-source-verified
---

# Playbook 05: Void Rating Reductions & Protected/Stabilized Ratings

Whenever a C-file shows VA **reduced a previously granted evaluation** or **severed service connection**—even 30 or 40 years ago, and even if the veteran never appealed—stop immediately and audit the reduction. Under *Brown v. Brown*, 5 Vet. App. 413 (1993), *Kitchens v. Brown*, 7 Vet. App. 320 (1995), and *Murphy v. Shinseki*, 26 Vet. App. 510 (2014), a rating reduction executed without strict observance of VA's regulatory safeguards is **void *ab initio*** (legally invalid from inception), compelling **full restoration of the prior rating retroactive to the date of the unlawful reduction—without needing to satisfy CUE**!

---

## 1. The Statutory & Regulatory Protection Matrix

*(See verbatim primary-source regulatory text in [`38-cfr-3.105e-3.344-3.951-3.957-reductions.md`](../authorities/part-3/38-cfr-3.105e-3.344-3.951-3.957-reductions.md) and pre-1991 statutory section numbers in [`title-38-statutory-crosswalk.md`](../docs/title-38-statutory-crosswalk.md)).*

| Protection Tier | Authority | Trigger Duration | Substantive & Procedural Mandate |
| :--- | :--- | :--- | :--- |
| **All Reductions Causing Payment Drop** | `38 U.S.C. § 5112(b)(6)` (`former § 3012(b)(6)`); `38 C.F.R. § 3.105(e), (i)` | Any duration (if total monthly compensation drops) | VA **must** issue **proposal-to-reduce notice** with detailed reasons, give **60 days** to submit evidence / **30 days** to request a predetermination hearing (`§ 3.105(i)`), AND make reduction effective **last day of the month in which a 60-day period after final notice expires** (*Murphy*, 26 Vet. App. at 515). |
| **Severance Under 10 Years** | `38 C.F.R. § 3.105(d)` | Service connection in force **<10 years** | Burden rests on **VA** to prove prior grant was **clearly and unmistakably erroneous** (with medical certification that prior diagnosis was clearly erroneous) + **60-day proposal notice** and delayed effective date! |
| **Total (`100%` / TDIU) Ratings** | `38 U.S.C. § 1163(a)` (`former § 363(a)`); `38 C.F.R. § 3.343(a) & (c)(1)–(2)` | Any `100%` schedular or TDIU rating | Schedular `100%` cannot be reduced without exam showing **material improvement** under ordinary conditions of life and work (`§ 3.343(a)`; *Ternus v. Brown*, 6 Vet. App. 370 (1994)). TDIU cannot be reduced without **clear and convincing evidence of actual employability** (`§ 3.343(c)(1)`), nor solely for engaging in substantially gainful employment unless maintained for **12 consecutive months** (`§ 3.343(c)(2)`). |
| **5-Year Stabilized Ratings** | `38 C.F.R. § 3.344(a)–(c)` | Same or higher evaluation in effect **5 years or more** | **(1)** Exam must be **full and complete**, reviewing the **entire medical history**; **(2)** Must show **sustained improvement** (not temporary remission!), so a **single exam** cannot justify reduction of episodic conditions unless all record evidence concurs; **(3)** Improvement must hold up under **ordinary conditions of life and work**! |
| **10-Year Service Connection Protection** | `38 U.S.C. § 1159` (`former § 359`); `38 C.F.R. § 3.957` | SC in force **10 years or more** (effective date of SC to effective date of severance) | Service connection **cannot be severed** except upon proof of **fraud** or clear military-record proof of lack of requisite service / character of discharge. *(See also **`38 C.F.R. § 3.953(a)–(b)`** protecting compensation/SC payable on **Dec. 31, 1957** under `Pub. L. 85-56` and **Dec. 31, 1958** under `Pub. L. 85-857`)*. |
| **20-Year Continuous Rating Protection** | `38 U.S.C. § 110`; `38 C.F.R. § 3.951(b)` | Continuous rating at or above a % for **20 years or more** | Rating **cannot be reduced below that percentage** except upon proof of **fraud**—even if the veteran makes a complete medical recovery or the original grant was CUE! |
| **VASRD Schedule Revisions** | `38 U.S.C. § 1155` (`former § 355`); `38 C.F.R. § 3.951(a)` | Any existing rating on effective date of a VASRD change | A change in the Rating Schedule (e.g., May 19, 2024 GERD `DC 7206` overhaul) **can NEVER by itself reduce** an existing disability rating! |

---

## 2. C-File Red Flags (Audit Triggers)

* **The "Single C&P Exam" Reduction of PTSD / Back / Asthma:** Veteran held `50%` or `70%` PTSD from 1978 to 1985 (`7` years -> stabilized under `§ 3.344(c)`!). In 1985, VA scheduled one 20-minute routine C&P exam where the examiner did *not* have or review the complete C-file (*Stern v. McDonough*, 34 Vet. App. 51 (2021)) and noted *"Veteran doing somewhat better today"*, so RO cut `70% -> 30%`. **Void *ab initio*!**
* **Missing Predetermination Notice (`§ 3.105(e)`):** RO issued a single rating decision cutting `40% -> 10%` effective immediately (or first of next month) without ever sending a `Proposed Rating Reduction` letter offering 60 days for evidence and a 30-day predetermination hearing!
* **20-Year Retroactive Crossover Trap (`38 U.S.C. § 110`):** Under `§ 3.951(b)`, the 20-year clock runs from the **effective date** of the evaluation—including when a retroactive award (e.g., CUE or appeal) grants `50%` from 1995 to 2016! Once 20 continuous years attach, VA cannot cut below `50%`.

---

## 3. Bitemporal Pathway Selection: Void Restoration vs. CUE

1. **Direct Motion / Claim to Restore Void Reduction (Preferred — Bypasses *George* CUE Bars!):**
   * Under *Brown v. Brown*, 5 Vet. App. 413, 421–22 (1993) and *Kitchens v. Brown*, 7 Vet. App. 320, 325 (1995), a reduction violating `§ 3.344`, `§ 3.343`, or `§ 3.105(e)` is **not merely erroneous—it is void *ab initio***, meaning the claimant does **not** have to meet the strict `§ 3.105(a)` CUE standard or confront `38 C.F.R. § 20.1403(e)` / *George v. McDonough*, 596 U.S. 740 (2022) change-in-interpretation defenses (though practitioners routinely plead **BOTH** voidness *ab initio* under *Brown*/*Kitchens*/*Murphy* **AND**, in the alternative, CUE under `38 C.F.R. § 3.105(a)` / `§ 7111` for belt-and-suspenders protection!).
2. **Remedy — Outright Reversal, Never Curative Remand (*Schafrath*, *Kitchens*, *Horn*, *Murphy* & *Stern*):** Unlike ordinary compensation claims where an inadequate exam triggers a remand for a new exam, whenever VA bears the affirmative burden of proof—as in rebuttal of soundness (*Horn v. Shinseki*, 25 Vet. App. 231, 243–44 (2012)), severance (`§ 3.105(d)`), or rating reductions (`§§ 3.105(e), 3.343, 3.344`)—**the sole lawful remedy for VA's failure to carry its burden is outright reversal and reinstatement of the prior rating/service connection retroactive to the date of the unlawful reduction, NEVER a remand to let VA gather better evidence against the veteran** (*Schafrath v. Derwinski*, 1 Vet. App. 589, 595–96 (1991); *Kitchens*, 7 Vet. App. at 325; *Murphy*, 26 Vet. App. at 517; *Stern*, 34 Vet. App. at 59)!
