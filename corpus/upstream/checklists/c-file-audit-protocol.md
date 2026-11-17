---
id: checklist-c-file-audit-protocol
title: "C-File & VBMS eFolder Chronological Audit Protocol"
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
  - appeals-cavc-litigation
statutes:
  - "38 U.S.C. § 5104"
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
  - "38 C.F.R. § 20.1403(e)"
diagnostic_codes: []
key_precedents:
  - "Bell v. Derwinski, 2 Vet. App. 611 (1992)"
  - "Russell v. Principi, 3 Vet. App. 310 (1992) (en banc)"
  - "Lang v. Wilkie, 971 F.3d 1348 (Fed. Cir. 2020)"
  - "George v. McDonough, 596 U.S. 740 (2022)"
  - "Barry v. McDonough, 101 F.4th 1348 (Fed. Cir. 2024)"
  - "Soto v. United States, 605 U.S. 360 (2025)"
  - "Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026)"
retro_pathways:
  - cue-ro-3.105a
  - cue-bva-7111
  - service-records-3.156c
  - pending-unadjudicated-claim
  - defective-notice-presumption-rebuttal
  - void-rating-reduction
  - nehmer-3.816
  - ama-explicit-notice-5104b
  - crsc-soto-settlement
c_file_triggers:
  - "Initial intake of a 1,000–15,000+ page VBMS eFolder or legacy FOIA C-file"
kill_switches:
  - "Skipping early Rating Code Sheets or DD-214/OMPF boxes and reading only recent AMA decisions"
  - "Defaulting to CUE on a judicial-reinterpretation theory barred by George v. McDonough, 596 U.S. 740 (2022) and 38 C.F.R. § 20.1403(e) when an open-claim or § 3.156(b)-(c) vehicle exists"
verification_status: primary-source-verified
---

# C-File & VBMS eFolder Chronological Audit Protocol

Never audit a C-file backwards from today's rating alone. Six-figure retroactive recoveries are won by reconstructing the **exact timeline of claims, evidence association dates, rating code sheets, and mailing addresses** from separation forward.

---

## Pass 1: Service Profile & Presumptive / Class Triage (15 Minutes)

- [ ] **Service Dates, Branch & Retiree Status (`DD-214`, `DD-215`, `AGO 53-55`, `NGN 22` — see [`Forms & Code-Sheet Lexicon`](../docs/forms-and-codesheet-lexicon.md)):**
  - [ ] Did the veteran have **90+ days continuous wartime/post-1946 active service**? *(Unlocks `38 C.F.R. § 3.309(a)` 1-year chronic disease, `§ 3.309(b)` tropical, `§ 3.309(c)` POW, and `§ 3.318` ALS `20%` minimum presumptions—run [Playbook 07](../playbooks/07-statutory-presumptions-chronic-tropical-pow-als.md)).*
  - [ ] Is the veteran a **20-year retiree or Chapter 61 medical retiree**? *(Flag immediately for uncapped **CRSC back pay** under Soto v. United States, 605 U.S. 360 (2025)).*
  - [ ] Any **Purple Heart**, CIB, CAR, Combat Medical Badge, Parachutist/airborne wings, or Prisoner of War status?
- [ ] **Geographic / Toxic Exposure Footprint:**
  - [ ] **Republic of Vietnam (land, inland waterways, OR 12nm offshore Blue Water Navy):** Flag **ALL** post-Sept. 25, 1985 claims and medical diagnoses against `38 C.F.R. § 3.816` (*Nehmer* — noting `M21-1 VIII.i.2.B.1.c` excludes chloracne, hypertension, and MGUS from `§ 3.816`).
  - [ ] **Korean DMZ, Thailand, Laos, Cambodia, Guam, Camp Lejeune, SW Asia / Post-9/11 Burn Pits:** Cross-check `§ 3.307(a)(6)` vs. PACT Act (`38 U.S.C. §§ 1116, 1119, 1120`).
- [ ] **Completeness of Service Records (`STRs` & `OMPF`):**
  - [ ] Are **inpatient clinical hospital packets** missing (only outpatient jacket in VBMS)?
  - [ ] Any **1973 NPRC Fire** memo (`NA Form 13055`)?
  - [ ] When were STRs, deck logs, or JSRRC stressor reports **date-stamped into the C-file**? *(Compare receipt dates against EVERY prior denial for `38 C.F.R. § 3.156(c)`!).*

---

## Pass 2: Chronological Claims vs. Adjudications Ledger (30 Minutes)

Build a two-column chronological ledger (`Claim / Evidence Trigger` -> `VA Disposition & Mailing`):

- [ ] **Discharge / First Claim (`VA Form 8-526`, `21-526`, `21-526EZ`):**
  - [ ] List **every single word/symptom** written by the veteran on the very first application.
  - [ ] Compare item-by-item against Rating Code Sheet #1 (translating pre-Jan. 1, 1959 `Veterans' Regulation No. 1(a)` citations under `Pub. L. 85-857` and `1959–1991` `300`/`3000`/`4000` statutory citations under `Pub. L. 102-40` & `Pub. L. 102-83`). Were any claimed conditions **left completely off** the rating decision?
- [ ] **Pre-March 24, 2015 Informal & Inferred Claims:**
  - [ ] Audit every `VA Form 21-4138`, handwritten letter, VSO memo, and congressional inquiry before **March 24, 2015** (`79 FR 57660`).
  - [ ] Once *any* condition became service-connected (even at `0%`!), scan VAMC admission summaries and VA outpatient clinic reports prior to **March 24, 2015** showing worsening without a follow-on rating decision (`historical 38 C.F.R. § 3.157(b)`).
  - [ ] Check every increased-rating claim for mention of **job loss, SSDI, VR&E infeasibility, or inability to work** (*Roberson* / *Rice* unadjudicated TDIU).
- [ ] **Post-February 19, 2019 AMA Explicit Notice Audit (*Hamill v. Collins*, 2026):**
  - [ ] For **every** AMA decision (`2019–present`), verify whether any claimed issue on `21-526EZ`/`20-0995` OR any reasonably raised issue on a C&P DBQ (e.g., radiculopathy, scars, TDIU, SMC) was **omitted from the decision notice**. Under `38 U.S.C. § 5104(b)` and *Hamill v. Collins*, `166 F.4th 1030 (Fed. Cir. 2026)`, omitted AMA issues remain **open and pending**!
- [ ] **NOD / SOC & `§ 3.156(b)` Post-Decision VAMC Audit (Legacy Claims Before Feb. 19, 2019):**
  - [ ] Did the veteran send *any* written disagreement within 1 year of a rating notice where VA **never issued a Statement of the Case (SOC)**? *(Appeal remains open indefinitely!)*
  - [ ] **The *Lang* 1-Year Post-Decision VAMC Check (`38 C.F.R. § 3.156(b)`):** Did a VAMC generate relevant clinical records within **365 days *after*** a post-July 21, 1992 Legacy RO decision without VA determining whether they were new and material (*Lang v. Wilkie*, `971 F.3d 1348 (Fed. Cir. 2020)`)? *(Legacy decision never became final!)*
- [ ] **BVA Subsumption & Mandatory Pre-Filing Gate:**
  - [ ] List all BVA decisions (`date`, `issues decided`, `remanded vs. denied vs. dismissed`). Never file an RO CUE (`§ 3.105(a)`) on an issue later decided on the merits by BVA—and **never** file a Board CUE (`38 U.S.C. § 7111`) without first clearing [`board-cue-pre-filing-gate.md`](board-cue-pre-filing-gate.md) (`38 C.F.R. § 20.1409(c)` one-shot rule)!

---

## Pass 3: Substantive Code-Sheet & Bitemporal Notice Audit (30 Minutes)

- [ ] **Combat / Penetrating Wounds:** Any `0%` or `10%` scar (`DC 7800–7805`) for a GSW, shrapnel, grenade, or penetrating wound? -> Run [Playbook 01](../playbooks/01-penetrating-wounds-scars-vs-muscles.md) (`DC 5301–5323` muscle groups + peripheral nerves).
- [ ] **Address & `§ 3.655` No-Show Audit:** Any missed-exam denial or unappealed adverse decision? Compare cover-letter address against every prior/contemporary address in C-file and check for `"Returned Undeliverable"` scans -> Run [Playbook 02](../playbooks/02-wrong-address-defective-notice-cp-exams.md).
- [ ] **Rating Reductions / Severances:** Did *any* percentage ever go **down** on a subsequent code sheet? Check `§ 3.105(d)–(e)` 60-day notice, `§ 3.344` 5-year stabilization, `§ 3.957` 10-year severance bar, `§ 3.953` Dec. 31, 1957/1958 savings protection, and `§ 3.951(b)` 20-year floor -> Run [Playbook 05](../playbooks/05-void-rating-reductions-stabilized-ratings.md).
- [ ] **Math & Mandatory SMC Audit:**
  - [ ] Check Combined Ratings math (`§ 4.25`), Bilateral Factor & April 16, 2023 Exclusion Rule (`§ 4.26(d)`), and `§ 4.59` painful-motion `10%+` joint minimums.
  - [ ] Whenever veteran hit `100%` (or single-disability TDIU under *Bradley*) + `60%` independent disabilities, verify `SMC(s)` was paid; if at `SMC(l)–(n)`, verify **multi-step bumps** under `§ 3.350(f)(3)–(4)` (*Barry v. McDonough*, `101 F.4th 1348 (Fed. Cir. 2024)`)!
  - [ ] Check `SMC(k)` for radical prostatectomy, ED secondary to DMII/PTSD meds, or loss of use of foot/hand.
- [ ] **Bitemporal & Primary-Source Cutoff Verification:**
  - [ ] Is a CUE motion reliant on VAMC records *not* physically in the paper C-file? Confirm decision date is **on or after July 21, 1992** (*Bell v. Derwinski*; `VAOPGCPREC 12-95`).
  - [ ] Does the theory rely on a **later judicial reinterpretation** (e.g., *Bradley* in 2008 or *Barry* in 2024)? Under *George v. McDonough*, `596 U.S. 740 (2022)` and `38 C.F.R. § 20.1403(e)`, route through an **open/non-final claim** (`§ 3.156(b)–(c)`, defective notice, pending claim) rather than CUE against a prior final decision!
  - [ ] Confirm exact Federal Register **effective date** (not publication date!) and verbatim VASRD text using [`authorities/`](../authorities/README.md), [`cfr-diffs/`](../cfr-diffs), and [`authority-verification-log.md`](../docs/authority-verification-log.md).
