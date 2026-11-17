export type IngestionWaveId = "W1" | "W2" | "W3" | "W4" | "W5";

export interface PlannedPlaceholderTopic {
  slug: string;
  route: string;
  title: string;
  category: "playbook" | "cfr" | "doctrine" | "era-lens" | "checklist" | "cases";
  waveId: IngestionWaveId;
  authoritySummary: string;
  veteranPreview: string;
  practitionerPreview: string;
  officialFallbackUrl: string;
}

export const DECISION_DATE_ERA_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  windowLabel: string;
  representativeDate: string;
  summary: string;
}> = [
  {
    id: "era-1946-1961",
    label: "Post-WWII & Korea",
    windowLabel: "1946–1961",
    representativeDate: "1954-06-15",
    summary: "1945 VASRD baseline (eff. Apr. 1, 1946), Vet. Reg. No. 1(a), and Jan. 1, 1959 Title 38 codification (Pub. L. 85-857).",
  },
  {
    id: "era-1962-1988",
    label: "Pre-VJRA Closed Era",
    windowLabel: "1962–1988",
    representativeDate: "1974-08-12",
    summary: "Jan. 1, 1963 mandatory SOC (Pub. L. 87-666), former § 211(a) finality bar, pre-Bell record scope, and § 3.157(b) hospital-report claims.",
  },
  {
    id: "era-1988-2000",
    label: "VJRA Revolution",
    windowLabel: "1988–2000",
    representativeDate: "1994-05-10",
    summary: "Creation of COVA/CAVC, Bell constructive possession (July 21, 1992), two-step 1991 Title 38 renumbering, and 1997 § 4.56 & Board CUE Act.",
  },
  {
    id: "era-2000-2018",
    label: "VCAA Legacy Era",
    windowLabel: "2000–2018",
    representativeDate: "2010-03-15",
    summary: "VCAA notice/duty-to-assist, 2006 § 3.156(c) overhaul, 2008 TBI & Scars updates, and March 24, 2015 repeal of informal claims.",
  },
  {
    id: "era-2019-present",
    label: "AMA & PACT Modern Era",
    windowLabel: "2019–Present",
    representativeDate: "2024-07-01",
    summary: "Feb. 19, 2019 AMA 3-lane system (§ 5104(b) Hamill), George v. McDonough (2022), PACT Act, 2024 COD § 3.12 overhaul, and Barry SMC math.",
  },
];

export const FEATURED_PLANNED_PLACEHOLDERS: ReadonlyArray<PlannedPlaceholderTopic> = [
  {
    slug: "02-wrong-address-defective-notice-cp-exams",
    route: "/playbooks/02-wrong-address-defective-notice-cp-exams",
    title: "Playbook 02: Wrong-Address Mailings, Unreceived Notices & Missed C&P Exams",
    category: "playbook",
    waveId: "W2",
    authoritySummary: "38 C.F.R. § 3.655 · Mindenhall · Cross · Romero",
    veteranPreview:
      "Planned Wave 2 guide explaining what happens when VA mailed a notice or exam letter to an outdated address despite having a newer address in VAMC or claims records.",
    practitionerPreview:
      "Queued for Wave 2 ingestion: presumption-of-regularity rebuttal audit, VA Form 10-7131 constructive address notice, and § 3.655 pre-1990 vs. post-1990 good-cause bars.",
    officialFallbackUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/section-3.655",
  },
  {
    slug: "04-unadjudicated-tdiu-informal-claims-smc",
    route: "/playbooks/04-unadjudicated-tdiu-informal-claims-smc",
    title: "Playbook 04: Unadjudicated TDIU, Pre-2015 Informal Claims & Statutory SMC",
    category: "playbook",
    waveId: "W2",
    authoritySummary: "38 C.F.R. §§ 3.155, 3.157(b), 4.16 · Roberson · Rice · Shea",
    veteranPreview:
      "Planned Wave 2 guide on older hospital reports and unemployability clues that VA may never have formally decided.",
    practitionerPreview:
      "Queued for Wave 2 ingestion: Roberson/Rice inferred TDIU triggers, pre-March 24, 2015 § 3.157(b) VAMC reports, and mandatory statutory SMC(s)/(k) audits.",
    officialFallbackUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.16",
  },
  {
    slug: "05-void-rating-reductions-stabilized-ratings",
    route: "/playbooks/05-void-rating-reductions-stabilized-ratings",
    title: "Playbook 05: Void Rating Reductions & Protected Evaluations (5 / 10 / 20-Year Shields)",
    category: "playbook",
    waveId: "W2",
    authoritySummary: "38 C.F.R. §§ 3.105(e), 3.344, 3.951, 3.957 · Brown v. Brown",
    veteranPreview:
      "Planned Wave 2 guide explaining VA's strict rules before lowering a long-standing disability percentage—and why improper reductions can be restored.",
    practitionerPreview:
      "Queued for Wave 2 ingestion: Brown void ab initio reinstatement (bypassing CUE!), § 3.344 sustained-improvement standard, and § 3.105(e) 60-day notice gates.",
    officialFallbackUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/section-3.344",
  },
  {
    slug: "08-survivor-dic-direct-and-1318-hypothetical",
    route: "/playbooks/08-survivor-dic-direct-and-1318-hypothetical",
    title: "Playbook 08: Survivor DIC (§ 1310 Direct, § 1318 10-Year Total & PACT § 1305 Re-Election)",
    category: "playbook",
    waveId: "W3",
    authoritySummary: "38 U.S.C. §§ 1310, 1318, 1305 · 38 C.F.R. §§ 3.22, 3.33, 3.312",
    veteranPreview:
      "Planned Wave 3 survivor guide covering Dependency and Indemnity Compensation (DIC), the 10-year 100% rule, and PACT Act re-evaluations of prior denials.",
    practitionerPreview:
      "Queued for Wave 3 ingestion: § 3.22(b)(1)–(2) posthumous CUE / § 3.156(c) hypothetical reconstruction, NOVA II/Rodriguez, and § 3.33 retroactive PACT effective dates.",
    officialFallbackUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/section-3.22",
  },
  {
    slug: "12-aid-and-attendance-smc-l-r1-r2-and-smc-t",
    route: "/playbooks/12-aid-and-attendance-smc-l-r1-r2-and-smc-t",
    title: "Playbook 12: Special Monthly Compensation — Aid & Attendance, Barry Steps & TBI SMC(t)",
    category: "playbook",
    waveId: "W3",
    authoritySummary: "38 U.S.C. § 1114(k)–(t) · 38 C.F.R. §§ 3.350, 3.352 · Barry · Laska",
    veteranPreview:
      "Planned Wave 3 guide explaining higher monthly compensation when service-connected disabilities require regular help with daily activities or TBI supervision.",
    practitionerPreview:
      "Queued for Wave 3 ingestion: Barry v. McDonough cumulative § 3.350(f)(3)–(4) bumps (George open-claim vs. CUE gate), Laska SMC(t), and § 5503(c) hospital traps.",
    officialFallbackUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/section-3.350",
  },
  {
    slug: "20-backpay-offsets-crdp-crsc-severance-recoupment",
    route: "/playbooks/20-backpay-offsets-crdp-crsc-severance-recoupment",
    title: "Playbook 20: Back-Pay Audits — CRDP, CRSC (Soto) & Combat Severance Non-Recoupment",
    category: "playbook",
    waveId: "W5",
    authoritySummary: "10 U.S.C. §§ 1413a, 1414, 1212(d)(2) · Soto v. United States (2025)",
    veteranPreview:
      "Planned Wave 5 guide on military retiree concurrent pay, Combat-Related Special Compensation (CRSC), and improper disability severance pay deductions.",
    practitionerPreview:
      "Queued in VA-law-planning EPIC-06 (Wave 5): Soto 6-year Barring Act abolition on CRSC arrears, combat-zone severance recoupment audits, and § 3.700 net-tax caps.",
    officialFallbackUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-3/section-3.700",
  },
];
