---
id: checklist-case-screening-worksheet
title: "Blank C-File Retroactive Screening & Intake Worksheet"
category: checklist
effective_from: "1946-04-01"
effective_to: "present"
bitemporal_scope: mixed-see-text
practice_domains:
  - finality-and-cue
  - disability-compensation
  - toxic-exposure
  - vasrd-rating-schedule
  - tdiu-unemployability
  - smc-ancillary
  - effective-dates-offsets
statutes:
  - "38 U.S.C. § 5104(b)"
  - "38 U.S.C. § 5109A"
  - "38 U.S.C. § 5110"
  - "38 U.S.C. § 7111"
  - "10 U.S.C. § 1413a"
cfr_citations:
  - "38 C.F.R. § 3.105(a)"
  - "38 C.F.R. § 3.156(b)"
  - "38 C.F.R. § 3.156(c)"
  - "38 C.F.R. § 3.157(b)"
  - "38 C.F.R. § 3.344"
  - "38 C.F.R. § 3.350(f)"
  - "38 C.F.R. § 3.816"
diagnostic_codes: []
key_precedents:
  - "Bell v. Derwinski, 2 Vet. App. 611 (1992)"
  - "Russell v. Principi, 3 Vet. App. 310 (1992)"
  - "Lang v. Wilkie, 971 F.3d 1348 (Fed. Cir. 2020)"
  - "Barry v. McDonough, 101 F.4th 1348 (Fed. Cir. 2024)"
  - "Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026)"
  - "Soto v. United States, 605 U.S. 360 (2025)"
retro_pathways:
  - cue-ro-3.105a
  - cue-bva-7111
  - service-records-3.156c
  - pending-unadjudicated-claim
  - defective-notice-presumption-rebuttal
  - void-rating-reduction
  - nehmer-3.816
  - ama-explicit-notice-5104b
  - ama-continuous-pursuit-3.2500
  - crsc-soto-settlement
c_file_triggers:
  - "Copy-paste offline intake template aligned to schemas/case-screen.schema.json"
kill_switches:
  - "Storing completed worksheets with veteran PII inside a git-tracked folder (always save completed client worksheets outside the repository!)"
verification_status: primary-source-verified
---

# Blank C-File Retroactive Screening & Intake Worksheet

> [!CAUTION]
> **PII Rule:** Copy this template to your secure local/encrypted case folder **outside** this Git repository before filling in client-identifying details.

This worksheet enforces the mandatory **6-Step Operational Screening Order** (aligned to [`schemas/case-screen.schema.json`](../schemas/case-screen.schema.json)) so you never default to CUE when an open/pending-claim or `§ 3.156(c)` pathway is available.

---

## Header: Service Profile & Cross-System Flags

* **Case / Matter Reference (Anonymized ID):** `____________________`
* **Active Service Period(s):** `____________________` (`>= 90` continuous days? `[ ] Yes [ ] No`)
* **Combat / Awards (`PH`, `CIB`, `CAR`, `CMB`, `POW`):** `____________________`
* **Herbicide / Toxic Exposure Zone(s):** `[ ] RVN Boots-on-Ground` `[ ] RVN Blue Water (12nm)` `[ ] Korean DMZ` `[ ] Thailand` `[ ] Laos/Cambodia/Guam` `[ ] Camp Lejeune` `[ ] SW Asia/TERA`
* **Military Retiree Status (Title 10 CRSC Gate):** `[ ] None` `[ ] 20-Yr Regular/Reserve` `[ ] Ch. 61 Medical Retiree` `[ ] TDRL/Severance`

---

## Step 1: Finality, Mailing & Implicit-Denial Audit (Test BEFORE CUE!)

| Claim / Filing Date | Form / Document (`8-526`, `21-4138`, VAMC Report) | Exact Issues Claimed or Reasonably Raised | Decision Date & Agency (`RO` / `BVA`) | Notice Mailed to Latest Address of Record? | Returned Mail or Better VA Address? | Disposition (`Granted`, `Denied`, `Silent`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| | | | | `[ ] Yes [ ] No` | `[ ] Yes [ ] No` | |
| | | | | `[ ] Yes [ ] No` | `[ ] Yes [ ] No` | |
| | | | | `[ ] Yes [ ] No` | `[ ] Yes [ ] No` | |

* **NOD Without SOC Check (`1963 – Feb. 18, 2019`):** Did the veteran file a timely written disagreement with **no SOC ever issued**? `[ ] Yes (Appeal Still Pending!)` `[ ] No`
* **`38 C.F.R. § 3.156(b)` Post-Decision VAMC Check (*Lang v. Wilkie*, 2020):** Did a VAMC generate relevant clinical records within **1 year *after*** a post-July 21, 1992 Legacy RO decision without VA adjudicating whether they were new and material? `[ ] Yes (Legacy Decision Never Final!)` `[ ] No`
* **VACOLS Sweep Check (*Freund v. Collins*, 2026):** Was a legacy appeal closed (`1990–2025`) in VACOLS for a missing Form 9 despite timely action? `[ ] Yes` `[ ] No`
* **Silent Omission Regime:**
  * `[ ]` **AMA Decision (`>= Feb. 19, 2019`):** Implicit denial **abolished** (*Hamill v. Collins*, 2026; `38 U.S.C. § 5104(b)`). Omitted issue is **legally pending**!
  * `[ ]` **Legacy Decision (`< Feb. 19, 2019`):** Run *Deshotel* / *Adams* / *Hampton* reasonable-notice test.

---

## Step 2: Newly Associated Service Department Records (`38 C.F.R. § 3.156(c)`)

* Were **any** official service department records associated with the C-file *after* an earlier denial?
  * `[ ]` Inpatient hospital clinical records (distinct from outpatient STR jacket)
  * `[ ]` Unit morning reports / ship deck logs / command chronologies
  * `[ ]` JSRRC / CRUR stressor report or retroactive `DD-215` combat award
  * `[ ]` 1973 NPRC Fire reconstructed extracts (`SGO` index cards, pay/hospital records)
  * `[ ]` Declassified DoD exposure logs (`§ 3.156(c)(1)(iii)`)
* **Relevance & `(c)(2)` Check:**
  * Existed at time of prior decision? `[ ] Yes [ ] No`
  * Speaks to a disputed element in prior denial (*Blubaugh* / *Kisor*)? `[ ] Yes [ ] No`
  * Did veteran withhold identifying unit info in Claim #1 (`§ 3.156(c)(2)` / *Mayhue*)? `[ ] No (Good)` `[ ] Yes (Blocked)`

---

## Step 3: Pre-2015 Informal Claims (`§§ 3.155, 3.157(b)`) & Unadjudicated `TDIU`

* **Pre-March 24, 2015 `§ 3.157(b)` Hospital/Exam Trigger:**
  * Date SC first granted (even at `0%`): `____________`
  * Pre-`3/24/2015` VAMC admission or VA outpatient exam showing worsening with no rating follow-up: `____________`
* **Reasonably Raised `TDIU` (*Roberson* / *Rice*):**
  * During an open/increased-rating claim, did the record reflect unemployability (`SSDI`, `VR&E` infeasibility, medical/lay job-loss statements)? `[ ] Yes [ ] No`
  * Check `§ 4.16(a)(1)–(5)` single-disability clustering (common etiology / single body system / combat injuries `>= 60%` or `>= 40%` anchor): `____________________`

---

## Step 4: Special Regimes — Void Reductions & *Nehmer* (`§ 3.816`)

* **Rating Reduction / Severance Check:**
  * Did any evaluation ever drop (`e.g., 70% -> 30%`)? `[ ] Yes [ ] No`
  * Was rating in effect `>= 5` years (`§ 3.344`), `>= 10` years SC (`§ 3.957`), or `>= 20` years (`§ 3.951(b)`)? `____________`
  * Did VA send 60-day advance proposal notice (`§ 3.105(e)`) and prove sustained improvement under ordinary conditions of life and work (*Brown* / *Kitchens*)? `[ ] Yes` `[ ] No -> VOID AB INITIO!`
* ***Nehmer* Class Check (`38 C.F.R. § 3.816`):**
  * RVN / Blue Water Navy veteran with a covered herbicide condition previously denied (or diagnosed in medical records during a claim) on/after **Sept. 25, 1985**? `[ ] Yes [ ] No`

---

## Step 5: Last-Resort Collateral Attack — Clear and Unmistakable Error (CUE)

* **Subsumption & One-Shot Gate (See [`board-cue-pre-filing-gate.md`](board-cue-pre-filing-gate.md)):**
  * Did BVA ever decide this exact issue on the merits? `[ ] No -> AOJ CUE (§ 5109A)` `[ ] Yes -> BVA CUE (§ 7111 — ONE-SHOT LIMIT!)`
  * Has BVA *already* decided a prior CUE motion on this Board issue? `[ ] No` `[ ] Yes -> BARRED BY § 20.1409(c)!`
* **Record Scope (*Bell v. Derwinski* Gate):**
  * Challenged decision date: `____________`
  * `[ ]` **Before July 21, 1992:** Restricted strictly to documents **physically in the C-file** on decision date (`VAOPGCPREC 12-95`).
  * `[ ]` **On or After July 21, 1992:** Includes VA-generated medical records constructively in VA's possession.
* **Law-of-the-Era & Disqualifier Gate:**
  * Exact CFR edition & verbatim section pulled from `authorities/` / `govinfo` / FR? `[ ] Yes [ ] No`
  * Does theory rely on Duty-to-Assist / inadequate exam (*Cook* bar)? `[ ] No (Good)` `[ ] Yes (Dead)`
  * Does theory rely on a later judicial invalidation/reinterpretation (*George* bar)? `[ ] No (Good)` `[ ] Yes (Dead)`
  * **Combined Math Check (`§ 4.25`):** Would fixing the error have changed the rounded `10%` combined monthly payment on that date? `[ ] Yes` `[ ] No (Check when later ratings crossed a threshold!)`

---

## Step 6: Ancillary `SMC` & Cross-System Title 10 `CRSC` Multiplier

* **Mandatory `SMC` (`38 U.S.C. § 1114`; `38 C.F.R. § 3.350(f)`; *Akles* / *Buie* / *Bradley* / *Barry*):**
  * `[ ]` `SMC(s)`: Single `100%` (or post-2008 single-disability TDIU) + separate `60%+` combined disabilities
  * `[ ]` `SMC(k)`: Anatomical loss or loss of use of creative organ / foot / hand / eye
  * `[ ]` `SMC(l)–(n)` + **Multi-Step Bumps (*Barry v. McDonough*, 2024):** Additional independent `50%` (half-step `§ 3.350(f)(3)`) or `100%` (full-step `§ 3.350(f)(4)`) disabilities up to `SMC(o)`
* **Downstream Title 10 `CRSC` (*Soto v. United States*, 605 U.S. 360 (2025)):**
  * If military retiree (`20-yr` or `Ch. 61`) + combat-related nexus -> Route post-grant to branch CRSC board for **uncapped retroactive DFAS arrears** (no 6-year Barring Act cap!).
