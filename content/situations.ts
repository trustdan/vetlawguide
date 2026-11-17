export interface SituationEntryCard {
  id: string;
  title: string;
  veteranSummary: string;
  practitionerSummary: string;
  href: string;
  exampleQueries: string[];
}

export const CORE_SITUATION_CARDS: ReadonlyArray<SituationEntryCard> = [
  {
    id: "investigate-older-decision",
    title: "Investigate an Older Rating or Denial",
    veteranSummary:
      "Check what rules applied on an earlier VA decision date and which missing service or hospital records are worth asking an accredited representative about.",
    practitionerSummary:
      "Screen RO and Board decisions across T₀ historical 38 C.F.R. text, notice/mailing regularity, § 3.156(c) service records, and George / § 20.1403(e) collateral CUE limits.",
    href: "/investigate",
    exampleQueries: ["0% scar shrapnel wound", "missing hospital records", "VA Form 10-7131"],
  },
  {
    id: "research-vasrd-rating",
    title: "Research a Disability Rating or Diagnostic Code (VASRD)",
    veteranSummary:
      "Understand how VA evaluates conditions across all 15 body systems, including separate ratings for scars, muscles, and nerves.",
    practitionerSummary:
      "Inspect 38 C.F.R. Part 4 Diagnostic Codes (DC 5000–9918), § 4.14 Esteban anti-pyramiding, § 4.26(d) bilateral exclusion math, and SMC multipliers.",
    href: "/cfr",
    exampleQueries: ["DC 5313", "DC 7804", "DC 8045", "SMC(t)"],
  },
  {
    id: "compare-historical-cfr",
    title: "Compare Historical vs. Current 38 C.F.R. Regulations",
    veteranSummary:
      "See how VA rating rules changed over time—and tell enacted regulations apart from unfinalized proposals.",
    practitionerSummary:
      "Side-by-side verbatim CFR redlines with exact Federal Register publication vs. effective dates, Karnas transition rules, and quarantined RIN proposals.",
    href: "/cfr",
    exampleQueries: ["38 C.F.R. § 4.56", "62 FR 30235", "90 FR 46542"],
  },
  {
    id: "explore-ways-past-finality",
    title: "Explore Ways Past Finality",
    veteranSummary:
      "Learn the difference between newly found service records, pending claims, improper rating reductions, and Clear and Unmistakable Error (CUE).",
    practitionerSummary:
      "Traverse the finality-piercing hierarchy: Brown § 3.344 void reductions, § 3.156(c), pending NOD/SOC & Lang § 3.156(b), AMA § 5104(b) Hamill, Nehmer, RO CUE, and one-final-merits-per-issue Board CUE.",
    href: "/explore",
    exampleQueries: ["3.156(c)", "3.344", "5104(b) Hamill", "20.1409(c)"],
  },
  {
    id: "survivor-dic-accrued",
    title: "Explore Survivor (DIC / § 1318), Accrued & Substitution Rules",
    veteranSummary:
      "Plain-English guides for surviving spouses and families navigating DIC, pending claims at death, remarriage rules, and Nehmer benefits.",
    practitionerSummary:
      "Audit § 1310 direct DIC, § 1318 / § 3.22(b) hypothetical CUE/3.156(c) reconstruction, § 5121A substitution vs. § 5121 Haines bar, and § 3.816(f) estate payouts.",
    href: "/playbooks",
    exampleQueries: ["38 U.S.C. § 1318", "5121A substitution", "Nehmer estate"],
  },
];
