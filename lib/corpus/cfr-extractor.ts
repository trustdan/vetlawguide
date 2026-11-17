import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import matter from "gray-matter";
import { sanitizeSchemaTokens, stripInlineMarkdownFormatting } from "./markdown-ast";
import { buildOfficialFallbackUrls } from "./temporal";
import type {
  CfrBookmarkStatus,
  CfrTrapTable,
  CfrVersionRecord,
  CompanionCfrModule,
  CompiledCfrSection,
  CompiledCfrSnapshot,
  CompiledCfrVersion,
  CoverageState,
  UpstreamIndexEntry,
  VeteranOverlay,
} from "./types";

interface Wave1AuthorityMapping {
  sectionSlug: string;
  cfrSection: string;
  title: string;
  summary: string;
  authorityRelPath: string;
  authorityModuleId: string;
  diffRelPath: string | null;
  diffModuleId: string | null;
}

const WAVE_1_CFR_MAPPINGS: ReadonlyArray<Wave1AuthorityMapping> = [
  {
    sectionSlug: "38-cfr-4.56",
    cfrSection: "38 C.F.R. § 4.56",
    title: "Evaluation of Muscle Disabilities (DC 5301–5323, 1946–Present)",
    summary:
      "Governs evaluation of penetrating gunshot, shrapnel (SFW), and traumatic muscle-group injuries across Slight, Moderate, Moderately Severe, and Severe tiers, anchored by the July 3, 1997 watershed (62 FR 30235, published June 3, 1997).",
    authorityRelPath: "authorities/part-4/38-cfr-4.56-muscle-injuries-1946-to-present.md",
    authorityModuleId: "auth-38-cfr-4-56-muscle-injuries",
    diffRelPath: "cfr-diffs/vasrd/muscle-injuries-dc-5301-5323.md",
    diffModuleId: "cfr-diff-muscle-injuries-dc-5301-5323",
  },
  {
    sectionSlug: "38-cfr-4.118",
    cfrSection: "38 C.F.R. § 4.118",
    title: "Schedule of Ratings — Skin Scars & Disfigurement (DC 7800–7805, 1946–Present)",
    summary:
      "Tracks all four enacted VASRD scar eras—pre-2002 qualitative tiers, Aug. 30, 2002 8-characteristic disfigurement matrix, Oct. 23, 2008 count-based DC 7804 painful/unstable scars, and Aug. 13, 2018 linear-scar & 6-zone rules—plus quarantined 2025 proposed rule 90 FR 46542.",
    authorityRelPath: "authorities/part-4/38-cfr-4.118-scars-evolution.md",
    authorityModuleId: "authority-38-cfr-4-118-scars-evolution",
    diffRelPath: "cfr-diffs/vasrd/scars-dc-7800-7805.md",
    diffModuleId: "cfr-diff-scars-dc-7800-7805",
  },
  {
    sectionSlug: "38-cfr-3.156c",
    cfrSection: "38 C.F.R. § 3.156(c)",
    title: "Reconsideration Upon Receipt of Official Service Department Records (1962–Present)",
    summary:
      "Primary finality-bypassing vehicle requiring VA reconsideration and authorizing retroactive effective dates back to the original claim whenever pre-existing military, clinical, deck-log, morning-report, or declassified unit records are associated with the C-file.",
    authorityRelPath: "authorities/part-3/38-cfr-3.156c-service-records-evolution.md",
    authorityModuleId: "auth-38-cfr-3-156c-evolution",
    diffRelPath: null,
    diffModuleId: null,
  },
];

interface AuthoritySectionFilter {
  /** Optional per-filter override path (defaults to parent `AuthorityVerbatimSpec.authorityRelPath`). */
  authorityRelPath?: string;
  h2Num: number;
  /** Optional H3 substring match (case-insensitive), or `""` to match only direct H2 blockquotes before any `###` subheading. */
  h3Includes?: string;
  /** Optional H4 substring match (case-insensitive). */
  h4Includes?: string;
  /** Optional filter matching individual contiguous blockquote groups within the block. */
  quoteGroupIncludes?: string;
  /** Optional line-level slice within matched blockquotes to isolate a pinpoint CFR section/paragraph. */
  sectionHeaderSlice?: {
    startIncludes: string;
    stopIncludes?: ReadonlyArray<string>;
  };
  /** Include Markdown pipe tables (`| ... |`) immediately inside the matched block (e.g., DC 8045 10-facet table). */
  includeEmbeddedTables?: boolean;
  /** Optional deterministic post-transform for inline archival bracket variants or sentence reconstruction. */
  textTransform?: (text: string) => string;
}

interface AuthorityVerbatimSpec {
  authorityRelPath: string;
  filters: ReadonlyArray<AuthoritySectionFilter>;
  /** When this snapshot quotes a pinpoint historical excerpt rather than the full section, identifies its symmetric scope key. */
  excerptScopeKey?: string;
  excerptScopeLabel?: string;
  /** Optional symmetric sub-excerpts keyed by `excerptScopeKey` so `<CfrRedlineViewer />` never compares a pinpoint excerpt against an entire multi-page section. */
  scopedExcerpts?: Readonly<Record<string, ReadonlyArray<AuthoritySectionFilter>>>;
}

const VERSION_VERBATIM_SELECTORS: Readonly<Record<string, AuthorityVerbatimSpec>> = {
  // Wave 1 anchors
  "38-cfr-4.56-1946-pre1997": {
    authorityRelPath: "authorities/part-4/38-cfr-4.56-muscle-injuries-1946-to-present.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-4.56-1997-current": {
    authorityRelPath: "authorities/part-4/38-cfr-4.56-muscle-injuries-1946-to-present.md",
    filters: [{ h2Num: 2 }],
  },
  "38-cfr-4.118-1978-pre2002": {
    authorityRelPath: "authorities/part-4/38-cfr-4.118-scars-evolution.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-4.118-2002-scars": {
    authorityRelPath: "authorities/part-4/38-cfr-4.118-scars-evolution.md",
    filters: [{ h2Num: 2 }],
  },
  "38-cfr-3.156c-1962-pre2006": {
    authorityRelPath: "authorities/part-3/38-cfr-3.156c-service-records-evolution.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-3.156c-2006-current": {
    authorityRelPath: "authorities/part-3/38-cfr-3.156c-service-records-evolution.md",
    filters: [{ h2Num: 2 }],
  },

  // § 4.16 TDIU & former § 4.16(c)
  "38-cfr-4.16c-1989-mental": {
    authorityRelPath: "authorities/part-4/38-cfr-4.16-tdiu-evolution.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-4.16a-1990-marginal": {
    authorityRelPath: "authorities/part-4/38-cfr-4.16-tdiu-evolution.md",
    filters: [
      {
        h2Num: 2,
        textTransform: (txt) =>
          txt.replace(
            "Director, Compensation Service,",
            "Director, Compensation and Pension Service,",
          ),
      },
    ],
  },
  "38-cfr-4.16a-2014-current": {
    authorityRelPath: "authorities/part-4/38-cfr-4.16-tdiu-evolution.md",
    filters: [{ h2Num: 2 }],
  },

  // § 3.12 COD 2024 overhaul + §§ 3.6, 3.13, 3.354, 3.400(g), 3.301(d)
  "38-cfr-3.12-pre2024-cod": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-3.12-2024-cod": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 2 }],
  },
  "38-cfr-3.13-2022-current": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 3, h3Includes: "3.1" }],
  },
  "38-cfr-3.354-insanity": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 3, h3Includes: "3.2" }],
  },
  "38-cfr-3.400g-1962-military-records": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 3, h3Includes: "3.3" }],
  },
  "38-cfr-3.6-2022-duty-periods": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 4, h3Includes: "4.1" }],
  },
  "38-cfr-3.301d-2006-allen-substance-abuse": {
    authorityRelPath: "authorities/part-3/38-cfr-3.12-3.13-3.354-cod-insanity.md",
    filters: [{ h2Num: 4, h3Includes: "4.2" }],
  },

  // §§ 3.350–3.352 SMC & § 3.810 Clothing Allowance
  "38-cfr-3.350a7-2000-pre2002-mastectomy": {
    authorityRelPath: "authorities/part-3/38-cfr-3.350-3.352-smc-evolution.md",
    filters: [{ h2Num: 1, h3Includes: "1.1" }],
    excerptScopeKey: "sec-3.350-breast",
    excerptScopeLabel: "Breast-Loss SMC(k) Standard (former § 3.350(a)(7) vs. § 3.350(a) Intro)",
  },
  "38-cfr-3.350a7-2002-breast-smck": {
    authorityRelPath: "authorities/part-3/38-cfr-3.350-3.352-smc-evolution.md",
    filters: [
      {
        h2Num: 1,
        h3Includes: "",
        sectionHeaderSlice: { startIncludes: "**§ 3.350", stopIncludes: ["**(b) Ratings"] },
      },
    ],
    scopedExcerpts: {
      "sec-3.350-breast": [
        {
          h2Num: 1,
          h3Includes: "",
          sectionHeaderSlice: {
            startIncludes: "**(a)",
            stopIncludes: ["* **(1) Creative organ"],
          },
        },
      ],
    },
  },
  "38-cfr-3.350f-1983-barry-steps": {
    authorityRelPath: "authorities/part-3/38-cfr-3.350-3.352-smc-evolution.md",
    filters: [
      {
        h2Num: 1,
        h3Includes: "",
        sectionHeaderSlice: { startIncludes: "**(f)", stopIncludes: ["**(g)", "**(h)"] },
      },
    ],
  },
  "38-cfr-3.350j-3.352b-2018-smct": {
    authorityRelPath: "authorities/part-3/38-cfr-3.350-3.352-smc-evolution.md",
    filters: [
      { h2Num: 1, h3Includes: "", sectionHeaderSlice: { startIncludes: "**(j)" } },
      { h2Num: 2 },
      { h2Num: 3, h3Includes: "3.1" },
    ],
  },
  "38-cfr-3.810-2012-sursely-clothing": {
    authorityRelPath: "authorities/part-3/38-cfr-3.350-3.352-smc-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "3.3" }],
  },

  // § 3.310 Secondary Service Connection & Aggravation
  "38-cfr-3.310-1979-era1a": {
    authorityRelPath: "authorities/part-3/38-cfr-3.310-secondary-aggravation-evolution.md",
    filters: [{ h2Num: 1, h3Includes: "1.1" }],
  },
  "38-cfr-3.310-2001-era1b": {
    authorityRelPath: "authorities/part-3/38-cfr-3.310-secondary-aggravation-evolution.md",
    filters: [{ h2Num: 1, h3Includes: "1.2" }],
  },
  "38-cfr-3.310b-2006-secondary-aggravation": {
    authorityRelPath: "authorities/part-3/38-cfr-3.310-secondary-aggravation-evolution.md",
    filters: [
      {
        h2Num: 2,
        sectionHeaderSlice: { startIncludes: "**§ 3.310", stopIncludes: ["**(d)"] },
      },
    ],
  },
  "38-cfr-3.310d-2014-tbi-secondary": {
    authorityRelPath: "authorities/part-3/38-cfr-3.310-secondary-aggravation-evolution.md",
    filters: [
      {
        h2Num: 2,
        sectionHeaderSlice: { startIncludes: "**(d)" },
        includeEmbeddedTables: true,
      },
    ],
  },

  // § 4.71a Unified 5-Era Chain (Spine + Joints, Arthritis & 2021 Musculoskeletal Overhaul)
  "38-cfr-4.71a-1946-pre2002-spine": {
    authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
    filters: [
      {
        h2Num: 1,
        textTransform: (txt) =>
          txt.replace(/\s*\*\(Pre-September 23, 2002 text\)\*/gi, ""),
      },
    ],
    excerptScopeKey: "spine-schedule",
    excerptScopeLabel: "38 C.F.R. § 4.71a Spine Schedule (DC 5285–5295 -> DC 5235–5243)",
  },
  "38-cfr-4.71a-2002-ivds": {
    authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
    filters: [
      {
        h2Num: 1,
        sectionHeaderSlice: { startIncludes: "THE SPINE", stopIncludes: ["**5293"] },
      },
      {
        h2Num: 2,
        textTransform: (txt) => txt.replace(/\s*\[now 5243\]/gi, ""),
      },
      {
        h2Num: 1,
        sectionHeaderSlice: { startIncludes: "**5294" },
      },
    ],
    excerptScopeKey: "spine-schedule",
    excerptScopeLabel: "38 C.F.R. § 4.71a Spine Schedule (DC 5285–5295 -> DC 5235–5243)",
  },
  "38-cfr-4.71a-2003-spine": {
    authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
    filters: [{ h2Num: 3 }],
    excerptScopeKey: "spine-schedule",
    excerptScopeLabel: "38 C.F.R. § 4.71a Spine Schedule (DC 5285–5295 -> DC 5235–5243)",
  },
  "38-cfr-4.71a-joints-pre2021": {
    authorityRelPath: "authorities/part-4/38-cfr-4.71a-joints-arthritis-pre-and-post-2021.md",
    filters: [
      {
        authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
        h2Num: 3,
      },
      { h2Num: 2, h3Includes: "Era 1" },
      {
        h2Num: 3,
        h3Includes: "Era 1",
        textTransform: (txt) =>
          txt.replace(/\*\(Pre-2021 Prosthetic Notes\):\*\s*/g, ""),
      },
      { h2Num: 4, h3Includes: "Era 1" },
      { h2Num: 5, h3Includes: "Era 1" },
    ],
    scopedExcerpts: {
      "spine-schedule": [
        {
          authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
          h2Num: 3,
        },
      ],
    },
  },
  "38-cfr-4.71a-2021-musculoskeletal": {
    authorityRelPath: "authorities/part-4/38-cfr-4.71a-joints-arthritis-pre-and-post-2021.md",
    filters: [
      {
        authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
        h2Num: 3,
      },
      { h2Num: 2, h3Includes: "Era 2" },
      { h2Num: 3, h3Includes: "Era 2" },
      { h2Num: 4, h3Includes: "Era 2" },
      { h2Num: 5, h3Includes: "Era 2" },
      { h2Num: 6 },
    ],
    scopedExcerpts: {
      "spine-schedule": [
        {
          authorityRelPath: "authorities/part-4/38-cfr-4.71a-spine-evolution.md",
          h2Num: 3,
        },
      ],
    },
  },

  // § 4.130 Mental Disorders (2014 DSM-5 verbatim; 1996 DSM-IV stays SUMMARY_ONLY because DSM-IV DC headers/GAF notes are summarized in cfr-diffs/)
  "38-cfr-4.130-2014-dsm5": {
    authorityRelPath: "authorities/part-4/38-cfr-4.132-mental-disorders-pre-1996.md",
    filters: [{ h2Num: 2 }, { h2Num: 3 }, { h2Num: 4 }],
  },

  // §§ 4.110–4.114 Digestive (Pre-May 19, 2024 vs. Post-May 19, 2024 Overhaul)
  "38-cfr-4.114-pre2024-digestive": {
    authorityRelPath: "authorities/part-4/38-cfr-4.114-digestive-pre-and-post-2024.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-4.114-2024-digestive": {
    authorityRelPath: "authorities/part-4/38-cfr-4.114-digestive-pre-and-post-2024.md",
    filters: [{ h2Num: 2 }],
  },

  // §§ 4.100 & 4.104 Cardiovascular (4-Era Chain: 1946 -> 1998 LVEF -> 2006 § 4.100(a)-(c) -> 2021 METs + DC 7122 2021)
  "38-cfr-4.100-4.104-1946-pre1998-cardio": {
    authorityRelPath: "authorities/part-4/38-cfr-4.100-4.104-cardiovascular-evolution.md",
    filters: [{ h2Num: 1 }],
    excerptScopeKey: "dc-7005",
    excerptScopeLabel: "DC 7005 Arteriosclerotic Heart Disease / General Heart Formula",
  },
  "38-cfr-4.100-4.104-1998-cardio-lvef": {
    authorityRelPath: "authorities/part-4/38-cfr-4.100-4.104-cardiovascular-evolution.md",
    filters: [{ h2Num: 2, h3Includes: "DC 7005" }],
    excerptScopeKey: "sec-4100-dc-7005",
    excerptScopeLabel: "38 C.F.R. § 4.100 & DC 7005 / General Heart Formula",
    scopedExcerpts: {
      "dc-7005": [{ h2Num: 2, h3Includes: "DC 7005" }],
    },
  },
  "38-cfr-4.100-4.104-2006-mets-4100": {
    authorityRelPath: "authorities/part-4/38-cfr-4.100-4.104-cardiovascular-evolution.md",
    filters: [{ h2Num: 2 }],
    excerptScopeKey: "sec-4100-dc-7005",
    excerptScopeLabel: "38 C.F.R. § 4.100 & DC 7005 / General Heart Formula",
    scopedExcerpts: {
      "dc-7005": [{ h2Num: 2, h3Includes: "DC 7005" }],
    },
  },
  "38-cfr-4.100-4.104-2021-cardio-mets": {
    authorityRelPath: "authorities/part-4/38-cfr-4.100-4.104-cardiovascular-evolution.md",
    filters: [{ h2Num: 3 }, { h2Num: 4 }, { h2Num: 5 }],
    scopedExcerpts: {
      "dc-7005": [
        { h2Num: 3, sectionHeaderSlice: { startIncludes: "**§ 4.104" } },
        {
          h2Num: 4,
          sectionHeaderSlice: { startIncludes: "**7005", stopIncludes: ["**7007"] },
        },
      ],
      "sec-4100-dc-7005": [
        { h2Num: 3 },
        {
          h2Num: 4,
          sectionHeaderSlice: { startIncludes: "**7005", stopIncludes: ["**7007"] },
        },
      ],
    },
  },
  "38-cfr-4.104-7122-2021-notes": {
    authorityRelPath: "authorities/part-4/38-cfr-4.100-4.104-cardiovascular-evolution.md",
    filters: [{ h2Num: 5, sectionHeaderSlice: { startIncludes: "**7122" } }],
  },

  // § 4.124a TBI (DC 8045: 1996-2008 vs. 2014-present) & ALS (DC 8017 30% -> 100%)
  "38-cfr-4.124a-8045-pre2008-tbi": {
    authorityRelPath: "authorities/part-4/38-cfr-4.124a-tbi-and-peripheral-nerves-evolution.md",
    filters: [{ h2Num: 4, h3Includes: "Era 1" }],
  },
  "38-cfr-4.124a-8045-2014-dsm5-tbi": {
    authorityRelPath: "authorities/part-4/38-cfr-4.124a-tbi-and-peripheral-nerves-evolution.md",
    filters: [{ h2Num: 4, h3Includes: "Era 2", includeEmbeddedTables: true }],
  },
  "38-cfr-4.124a-8017-1946-pre2012-als": {
    authorityRelPath: "authorities/part-4/38-cfr-4.124a-tbi-and-peripheral-nerves-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "Era 1" }],
  },
  "38-cfr-4.124a-8017-2012-als-100": {
    authorityRelPath: "authorities/part-4/38-cfr-4.124a-tbi-and-peripheral-nerves-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "Era 2" }],
  },

  // Part 14 Attorney Fees & Part 20 Board CUE / AMA Windows
  "38-cfr-14.636-2008-post-nod-attorney-fees": {
    authorityRelPath: "authorities/part-20/38-cfr-part-20-ama-evid-windows-and-part-14-fees.md",
    filters: [{ h2Num: 4, h3Includes: "4.2" }],
    excerptScopeKey: "sec-14.636c",
    excerptScopeLabel: "38 C.F.R. § 14.636(c) Fee-Trigger Conditions",
  },
  "38-cfr-14.636-2019-ama-attorney-fees": {
    authorityRelPath: "authorities/part-20/38-cfr-part-20-ama-evid-windows-and-part-14-fees.md",
    filters: [{ h2Num: 4, h3Includes: "4.3" }],
    scopedExcerpts: {
      "sec-14.636c": [
        {
          h2Num: 4,
          h3Includes: "4.3",
          sectionHeaderSlice: { startIncludes: "**§ 14.636", stopIncludes: ["**(e)"] },
        },
      ],
    },
  },
  "38-cfr-20.1400-2019-ama-subpart-o-cue": {
    authorityRelPath: "authorities/part-20/38-cfr-part-20-ama-evid-windows-and-part-14-fees.md",
    filters: [{ h2Num: 3 }],
  },
  "38-cfr-20.202-20.303-2019-ama-board-windows": {
    authorityRelPath: "authorities/part-20/38-cfr-part-20-ama-evid-windows-and-part-14-fees.md",
    filters: [{ h2Num: 1 }, { h2Num: 2 }],
  },

  // § 3.304(b) Presumption of Soundness & § 3.304(f) Five-Phase PTSD Evolution
  "38-cfr-3.304b-1961-pre2005-soundness": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 1, h3Includes: "1.2", h4Includes: "Pre-May 4, 2005" }],
  },
  "38-cfr-3.304b-2005-wagner-soundness": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 1, h3Includes: "1.2", h4Includes: "Post-May 4, 2005" }],
  },
  "38-cfr-3.304f-1993-ptsd-base": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 2, h3Includes: "2.1", h4Includes: "Era 1A" }],
  },
  "38-cfr-3.304f-1999-cohen-combat-pow": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 2, h3Includes: "2.1", h4Includes: "Era 1B" }],
  },
  "38-cfr-3.304f-2002-mst-assault": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 2, h3Includes: "2.2" }],
  },
  "38-cfr-3.304f-2008-inservice-dx": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 2, h3Includes: "2.3" }],
  },
  "38-cfr-3.304f3-2010-fear-hostile": {
    authorityRelPath: "authorities/part-3/38-cfr-3.304f-ptsd-evolution.md",
    filters: [{ h2Num: 2, h3Includes: "2.4" }],
  },

  // § 3.22 DIC, § 3.312 Cause of Death, § 3.655 Exams, § 3.321(b)(1) Extraschedular, §§ 4.26/4.29/4.30
  "38-cfr-3.22-1989-pre2000": {
    authorityRelPath: "authorities/part-3/38-cfr-3.22-dic-hypothetical-evolution.md",
    filters: [
      {
        h2Num: 1,
        textTransform: (txt) =>
          txt.replace(/\s*\*\(Heading updated in 1990s print editions[\s\S]*?\)\*/gi, ""),
      },
    ],
    excerptScopeKey: "sec-3.22a",
    excerptScopeLabel: "38 C.F.R. § 3.22(a)",
  },
  "38-cfr-3.22-2012-current": {
    authorityRelPath: "authorities/part-3/38-cfr-3.22-dic-hypothetical-evolution.md",
    filters: [{ h2Num: 2 }],
    scopedExcerpts: {
      "sec-3.22a": [
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**§ 3.22", stopIncludes: ["**(b)"] },
        },
      ],
    },
  },
  "38-cfr-3.312-1989-cause-of-death": {
    authorityRelPath: "authorities/part-3/38-cfr-3.22-dic-hypothetical-evolution.md",
    filters: [{ h2Num: 3 }],
  },
  "38-cfr-3.655-1990-legacy": {
    authorityRelPath: "authorities/part-3/38-cfr-3.655-examinations-evolution.md",
    filters: [{ h2Num: 2 }],
  },
  "38-cfr-3.655-2019-ama": {
    authorityRelPath: "authorities/part-3/38-cfr-3.655-examinations-evolution.md",
    filters: [
      {
        h2Num: 2,
        sectionHeaderSlice: { startIncludes: "**§ 3.655", stopIncludes: ["**(b)"] },
      },
      {
        h2Num: 3,
        sectionHeaderSlice: {
          startIncludes: "**(b)",
          stopIncludes: ["**Cross References:**"],
        },
      },
      {
        h2Num: 2,
        sectionHeaderSlice: { startIncludes: "**(c)" },
      },
    ],
  },
  "38-cfr-3.321b1-1996-pre2014-collective": {
    authorityRelPath: "authorities/part-4/38-cfr-4.1-4.31-general-policy-snapshots.md",
    filters: [
      {
        h2Num: 5,
        h3Includes: "Era 1",
        textTransform: (txt) =>
          txt.replace(/\s*`\[[^\]]*Compensation Service[^\]]*\]`/g, ""),
      },
    ],
  },
  "38-cfr-3.321b1-2014-pre2018-collective": {
    authorityRelPath: "authorities/part-4/38-cfr-4.1-4.31-general-policy-snapshots.md",
    filters: [
      {
        h2Num: 5,
        h3Includes: "Era 1",
        textTransform: (txt) =>
          txt.replace(
            /Compensation and Pension Service\s*`\[[^\]]*Compensation Service[^\]]*\]`/g,
            "Compensation Service",
          ),
      },
    ],
  },
  "38-cfr-3.321b1-2018-single-disability": {
    authorityRelPath: "authorities/part-4/38-cfr-4.1-4.31-general-policy-snapshots.md",
    filters: [{ h2Num: 5, h3Includes: "Era 2" }],
  },
  "38-cfr-4.26d-2023-bilateral": {
    authorityRelPath: "authorities/part-4/38-cfr-4.1-4.31-general-policy-snapshots.md",
    filters: [
      {
        h2Num: 3,
        sectionHeaderSlice: { startIncludes: "**§ 4.26", stopIncludes: ["**§ 4.27"] },
      },
    ],
  },
  "38-cfr-4.29-4.30-2014-temp-total": {
    authorityRelPath: "authorities/part-4/38-cfr-4.1-4.31-general-policy-snapshots.md",
    filters: [{ h2Num: 4, sectionHeaderSlice: { startIncludes: "**§ 4.29" } }],
  },

  // § 3.157(b), §§ 3.1000/3.1010/3.816, §§ 3.400(o)(2)/3.2500/3.700, §§ 3.274–3.279/1.963, §§ 3.159/17.1005/Part 71, §§ 3.105/3.344/3.951/3.953/3.957
  "38-cfr-3.157b-1961-2015": {
    authorityRelPath: "authorities/part-3/38-cfr-3.155-3.157b-informal-claims-pre-2015.md",
    filters: [{ h2Num: 2 }],
  },
  "38-cfr-3.1000-1962-pre2003-2yr-cap": {
    authorityRelPath: "authorities/part-3/38-cfr-3.1000-3.1010-accrued-substitution.md",
    filters: [{ h2Num: 1 }],
    excerptScopeKey: "sec-3.1000a",
    excerptScopeLabel: "38 C.F.R. § 3.1000(a) Introductory Entitlement Clause",
  },
  "38-cfr-3.1000-2015-uncapped": {
    authorityRelPath: "authorities/part-3/38-cfr-3.1000-3.1010-accrued-substitution.md",
    filters: [{ h2Num: 2 }],
    scopedExcerpts: {
      "sec-3.1000a": [
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**§ 3.1000", stopIncludes: ["* **(1)**"] },
        },
      ],
    },
  },
  "38-cfr-3.1010-2014-substitution": {
    authorityRelPath: "authorities/part-3/38-cfr-3.1000-3.1010-accrued-substitution.md",
    filters: [{ h2Num: 3 }],
  },
  "38-cfr-3.816-2003-nehmer": {
    authorityRelPath: "authorities/part-3/38-cfr-3.1000-3.1010-accrued-substitution.md",
    filters: [
      {
        h2Num: 4,
        h3Includes: "",
        sectionHeaderSlice: {
          startIncludes: "**§ 3.816",
          stopIncludes: ["* **(4) Bar to accrued benefit claims.**"],
        },
        textTransform: (txt) =>
          `${txt} If, following such efforts, VA releases the full amount of unpaid benefits to a payee, VA may not thereafter pay any portion of such benefits to any other individual, unless VA is able to recover the payment previously released.`,
      },
      {
        h2Num: 4,
        h3Includes: "",
        sectionHeaderSlice: { startIncludes: "* **(4) Bar to accrued benefit claims.**" },
      },
    ],
  },
  "38-cfr-3.816-2021-nehmer-payee": {
    authorityRelPath: "authorities/part-3/38-cfr-3.1000-3.1010-accrued-substitution.md",
    filters: [{ h2Num: 4, h3Includes: "" }],
  },
  "38-cfr-3.400o2-1975-pre2015-informal": {
    authorityRelPath: "authorities/part-3/38-cfr-3.114-3.400-3.700-effective-dates-offsets.md",
    filters: [{ h2Num: 2, h3Includes: "2.1" }],
    excerptScopeKey: "sec-3.400-intro-o",
    excerptScopeLabel: "38 C.F.R. § 3.400 Intro & Paragraph (o)(1)–(2) Increases",
  },
  "38-cfr-3.400o2-2015-2019-itf": {
    authorityRelPath: "authorities/part-3/38-cfr-3.114-3.400-3.700-effective-dates-offsets.md",
    filters: [
      {
        h2Num: 2,
        h3Includes: "2.1",
        sectionHeaderSlice: { startIncludes: "**§ 3.400", stopIncludes: ["**(o)"] },
      },
      {
        h2Num: 2,
        h3Includes: "2.2",
        sectionHeaderSlice: { startIncludes: "**(o)", stopIncludes: ["**(q)"] },
      },
    ],
    excerptScopeKey: "sec-3.400-intro-o",
    excerptScopeLabel: "38 C.F.R. § 3.400 Intro & Paragraph (o)(1)–(2) Increases",
  },
  "38-cfr-3.400o2-2019-ama-intro": {
    authorityRelPath: "authorities/part-3/38-cfr-3.114-3.400-3.700-effective-dates-offsets.md",
    filters: [{ h2Num: 2, h3Includes: "2.2" }],
    scopedExcerpts: {
      "sec-3.400-intro-o": [
        {
          h2Num: 2,
          h3Includes: "2.2",
          sectionHeaderSlice: { startIncludes: "**§ 3.400", stopIncludes: ["**(b)"] },
        },
        {
          h2Num: 2,
          h3Includes: "2.2",
          sectionHeaderSlice: { startIncludes: "**(o)", stopIncludes: ["**(q)"] },
        },
      ],
    },
  },
  "38-cfr-3.2500-2019-oct-ama": {
    authorityRelPath: "authorities/part-3/38-cfr-3.114-3.400-3.700-effective-dates-offsets.md",
    filters: [{ h2Num: 3 }],
  },
  "38-cfr-3.700a3-2009-combat-severance": {
    authorityRelPath: "authorities/part-3/38-cfr-3.114-3.400-3.700-effective-dates-offsets.md",
    filters: [{ h2Num: 5, h3Includes: "5.1" }],
  },
  "38-cfr-3.274-3.275-pre2018-corpus": {
    authorityRelPath: "authorities/part-3/38-cfr-3.274-3.279-3.353-1.965-pension-competency-waivers.md",
    filters: [{ h2Num: 1 }],
    excerptScopeKey: "sec-3.274-3.275",
    excerptScopeLabel: "38 C.F.R. §§ 3.274 & 3.275 Net Worth & Asset Rules",
  },
  "38-cfr-3.274-3.278-2018-csra-lookback": {
    authorityRelPath: "authorities/part-3/38-cfr-3.274-3.279-3.353-1.965-pension-competency-waivers.md",
    filters: [{ h2Num: 2 }],
    scopedExcerpts: {
      "sec-3.274-3.275": [
        { h2Num: 2, h3Includes: "2.1" },
        { h2Num: 2, h3Includes: "2.2" },
      ],
    },
  },
  "38-cfr-1.963b2-pre2026-180day-waiver": {
    authorityRelPath: "authorities/part-3/38-cfr-3.274-3.279-3.353-1.965-pension-competency-waivers.md",
    filters: [{ h2Num: 4, h3Includes: "4.2" }],
  },
  "38-cfr-1.963b-2026-1yr-waiver": {
    authorityRelPath: "authorities/part-3/38-cfr-3.274-3.279-3.353-1.965-pension-competency-waivers.md",
    filters: [{ h2Num: 4, h3Includes: "4.3" }],
  },
  "38-cfr-3.159-2022-ama-duty-to-assist": {
    authorityRelPath:
      "authorities/part-3/38-cfr-3.159-17.1002-17.4000-21.282-evidence-emergency-pcafc-vre.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-17.1002-17.1005-2018-staab-emergency": {
    authorityRelPath:
      "authorities/part-3/38-cfr-3.159-17.1002-17.4000-21.282-evidence-emergency-pcafc-vre.md",
    filters: [{ h2Num: 2, h3Includes: "2.3", h4Includes: "Era 1" }],
    excerptScopeKey: "sec-17.1005a5",
    excerptScopeLabel: "38 C.F.R. § 17.1005(a)(5) Coinsurance / Prohibited-Payment Clause",
  },
  "38-cfr-17.1005-2023-wolfe-coinsurance": {
    authorityRelPath:
      "authorities/part-3/38-cfr-3.159-17.1002-17.4000-21.282-evidence-emergency-pcafc-vre.md",
    filters: [{ h2Num: 2, h3Includes: "2.3", h4Includes: "Era 2" }],
    scopedExcerpts: {
      "sec-17.1005a5": [
        {
          h2Num: 2,
          h3Includes: "2.3",
          h4Includes: "Era 2",
          sectionHeaderSlice: { startIncludes: "* **(5)**" },
        },
      ],
    },
  },
  "38-cfr-part-71-2025-pcafc-and-17.4020c": {
    authorityRelPath:
      "authorities/part-3/38-cfr-3.159-17.1002-17.4000-21.282-evidence-emergency-pcafc-vre.md",
    filters: [{ h2Num: 3 }],
  },
  "38-cfr-3.105i-1992-predetermination": {
    authorityRelPath: "authorities/part-3/38-cfr-3.105e-3.344-3.951-3.957-reductions.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-3.344-1993-stabilization": {
    authorityRelPath: "authorities/part-3/38-cfr-3.105e-3.344-3.951-3.957-reductions.md",
    filters: [{ h2Num: 3 }],
  },
  "38-cfr-3.951-1992-preservation": {
    authorityRelPath: "authorities/part-3/38-cfr-3.105e-3.344-3.951-3.957-reductions.md",
    filters: [{ h2Num: 4, quoteGroupIncludes: "**§ 3.951" }],
  },
  "38-cfr-3.953-1961-dec-savings": {
    authorityRelPath: "authorities/part-3/38-cfr-3.105e-3.344-3.951-3.957-reductions.md",
    filters: [{ h2Num: 4, quoteGroupIncludes: "**§ 3.953" }],
  },
  "38-cfr-3.957-1968-ten-year": {
    authorityRelPath: "authorities/part-3/38-cfr-3.105e-3.344-3.951-3.957-reductions.md",
    filters: [{ h2Num: 4, quoteGroupIncludes: "**§ 3.957" }],
  },

  // Remaining Part 4 VASRD Organ Systems
  "38-cfr-4.75-4.79-2008-eye": {
    authorityRelPath: "authorities/part-4/38-cfr-4.75-4.79-eye-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "Era 2" }],
    excerptScopeKey: "eye-general-formula",
    excerptScopeLabel: "38 C.F.R. § 4.79 General Rating Formula (DC 6000–6009)",
  },
  "38-cfr-4.75-4.79-2018-eye": {
    authorityRelPath: "authorities/part-4/38-cfr-4.75-4.79-eye-evolution.md",
    filters: [{ h2Num: 2 }, { h2Num: 3, h3Includes: "Era 3" }, { h2Num: 4 }, { h2Num: 5 }],
    scopedExcerpts: {
      "eye-general-formula": [{ h2Num: 3, h3Includes: "Era 3" }],
    },
  },
  "38-cfr-4.85-4.87-1999-auditory": {
    authorityRelPath: "authorities/part-4/38-cfr-4.85-4.87-auditory-tinnitus-evolution.md",
    filters: [{ h2Num: 2 }, { h2Num: 4 }],
  },
  "38-cfr-4.87-6260-1946-pre1999-trauma": {
    authorityRelPath: "authorities/part-4/38-cfr-4.85-4.87-auditory-tinnitus-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "Era 1" }],
  },
  "38-cfr-4.87-6260-1999-recurrent": {
    authorityRelPath: "authorities/part-4/38-cfr-4.85-4.87-auditory-tinnitus-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "Era 2" }],
  },
  "38-cfr-4.87-6260-2003-tinnitus-single": {
    authorityRelPath: "authorities/part-4/38-cfr-4.85-4.87-auditory-tinnitus-evolution.md",
    filters: [{ h2Num: 3, h3Includes: "Era 3" }],
  },
  "38-cfr-4.88a-4.88b-1996-infectious": {
    authorityRelPath: "authorities/part-4/38-cfr-4.88a-4.88b-infectious-cfs-evolution.md",
    filters: [
      { h2Num: 1 },
      { h2Num: 2, sectionHeaderSlice: { startIncludes: "**6304", stopIncludes: ["**6351"] } },
      { h2Num: 3, h3Includes: "Nutritional Deficiencies" },
      {
        h2Num: 3,
        h3Includes: "Systemic Immune",
        sectionHeaderSlice: { startIncludes: "**6350", stopIncludes: ["**6351"] },
      },
      { h2Num: 2, sectionHeaderSlice: { startIncludes: "**6351" } },
    ],
  },
  "38-cfr-4.88a-4.88b-2019-infectious-cfs": {
    authorityRelPath: "authorities/part-4/38-cfr-4.88a-4.88b-infectious-cfs-evolution.md",
    filters: [{ h2Num: 1 }, { h2Num: 3 }],
  },
  "38-cfr-4.96-4.97-1946-pre1996-respiratory": {
    authorityRelPath: "authorities/part-4/38-cfr-4.96-4.97-respiratory-evolution.md",
    filters: [{ h2Num: 2 }],
    excerptScopeKey: "dc-6602",
    excerptScopeLabel: "DC 6602 Bronchial Asthma",
  },
  "38-cfr-4.96-4.97-2006-may-tech": {
    authorityRelPath: "authorities/part-4/38-cfr-4.96-4.97-respiratory-evolution.md",
    filters: [
      {
        h2Num: 1,
        sectionHeaderSlice: { startIncludes: "**§ 4.96", stopIncludes: ["**(d)"] },
      },
      { h2Num: 3 },
      { h2Num: 4 },
    ],
    scopedExcerpts: {
      "dc-6602": [
        {
          h2Num: 4,
          h3Includes: "Trachea",
          sectionHeaderSlice: { startIncludes: "**6602", stopIncludes: ["**6603"] },
        },
      ],
    },
  },
  "38-cfr-4.96-4.97-2006-pft-exceptions": {
    authorityRelPath: "authorities/part-4/38-cfr-4.96-4.97-respiratory-evolution.md",
    filters: [{ h2Num: 1 }, { h2Num: 3 }, { h2Num: 4 }],
    scopedExcerpts: {
      "dc-6602": [
        {
          h2Num: 4,
          h3Includes: "Trachea",
          sectionHeaderSlice: { startIncludes: "**6602", stopIncludes: ["**6603"] },
        },
      ],
    },
  },
  "38-cfr-4.115a-4.115b-1994-gu": {
    authorityRelPath: "authorities/part-4/38-cfr-4.115a-4.115b-genitourinary-evolution.md",
    filters: [{ h2Num: 1 }, { h2Num: 2 }],
    excerptScopeKey: "gu-amended-provisions",
    excerptScopeLabel:
      "38 C.F.R. § 4.115, § 4.115a (Renal & UTI) & Amended § 4.115b Codes (DC 7508, 7512, 7522, 7527)",
  },
  "38-cfr-4.115a-4.115b-2021-gu": {
    authorityRelPath: "authorities/part-4/38-cfr-4.115a-4.115b-genitourinary-evolution.md",
    filters: [{ h2Num: 1 }, { h2Num: 3 }],
    scopedExcerpts: {
      "gu-amended-provisions": [
        { h2Num: 1 },
        {
          h2Num: 3,
          h3Includes: "3.A",
          sectionHeaderSlice: {
            startIncludes: "**§ 4.115a",
            stopIncludes: ["**Voiding dysfunction:**"],
          },
        },
        {
          h2Num: 3,
          h3Includes: "3.A",
          sectionHeaderSlice: { startIncludes: "**Urinary tract infection:**" },
        },
        {
          h2Num: 3,
          h3Includes: "3.B",
          sectionHeaderSlice: { startIncludes: "**7508", stopIncludes: ["**7520"] },
        },
        {
          h2Num: 3,
          h3Includes: "3.B",
          sectionHeaderSlice: { startIncludes: "**7522", stopIncludes: ["**7523"] },
        },
        {
          h2Num: 3,
          h3Includes: "3.B",
          sectionHeaderSlice: { startIncludes: "**7527", stopIncludes: ["**7528"] },
        },
      ],
    },
  },
  "38-cfr-4.116-1995-2002-gyn-breast": {
    authorityRelPath: "authorities/part-4/38-cfr-4.116-gynecological-breast-evolution.md",
    filters: [{ h2Num: 1 }],
    excerptScopeKey: "gyn-superseded-codes",
    excerptScopeLabel: "DC 7621–7623 (Pelvic Prolapse) & DC 7627–7628 / 7630–7631 (GYN & Breast Neoplasms)",
  },
  "38-cfr-4.116-2018-gyn-breast": {
    authorityRelPath: "authorities/part-4/38-cfr-4.116-gynecological-breast-evolution.md",
    filters: [{ h2Num: 2 }],
    scopedExcerpts: {
      "gyn-superseded-codes": [
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**7621", stopIncludes: ["**7624"] },
        },
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**7627", stopIncludes: ["**7629"] },
        },
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**7630", stopIncludes: ["**7632"] },
        },
      ],
    },
  },
  "38-cfr-4.117-2014-pre2018-hemic": {
    authorityRelPath: "authorities/part-4/38-cfr-4.117-hemic-lymphatic-evolution.md",
    filters: [{ h2Num: 1 }],
  },
  "38-cfr-4.117-2018-hemic-lymphatic": {
    authorityRelPath: "authorities/part-4/38-cfr-4.117-hemic-lymphatic-evolution.md",
    filters: [{ h2Num: 2 }],
  },
  "38-cfr-4.118-skin-1978-pre2002-7806": {
    authorityRelPath: "authorities/part-4/38-cfr-4.118-skin-general-formula-evolution.md",
    filters: [{ h2Num: 1 }],
    excerptScopeKey: "dc-7806-formula",
    excerptScopeLabel: "DC 7806 Dermatitis/Eczema & General Rating Formula for the Skin",
  },
  "38-cfr-4.118-skin-2002-7806": {
    authorityRelPath: "authorities/part-4/38-cfr-4.118-skin-general-formula-evolution.md",
    filters: [{ h2Num: 2 }],
    excerptScopeKey: "dc-7806-formula",
    excerptScopeLabel: "DC 7806 Dermatitis/Eczema & General Rating Formula for the Skin",
  },
  "38-cfr-4.118-skin-2018-general-formula": {
    authorityRelPath: "authorities/part-4/38-cfr-4.118-skin-general-formula-evolution.md",
    filters: [{ h2Num: 3 }],
    scopedExcerpts: {
      "dc-7806-formula": [{ h2Num: 3, h3Includes: "General Rating Formula" }],
    },
  },
  "38-cfr-4.119-pre2017-endocrine": {
    authorityRelPath: "authorities/part-4/38-cfr-4.119-endocrine-evolution.md",
    filters: [{ h2Num: 1 }],
    excerptScopeKey: "endocrine-7900-7903-7913",
    excerptScopeLabel: "DC 7900 Hyperthyroidism, DC 7903 Hypothyroidism & DC 7913 Diabetes Mellitus",
  },
  "38-cfr-4.119-2017-endocrine": {
    authorityRelPath: "authorities/part-4/38-cfr-4.119-endocrine-evolution.md",
    filters: [{ h2Num: 2 }],
    scopedExcerpts: {
      "endocrine-7900-7903-7913": [
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**§ 4.119", stopIncludes: ["**7901"] },
        },
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**7903", stopIncludes: ["**7904"] },
        },
        {
          h2Num: 2,
          sectionHeaderSlice: { startIncludes: "**7913", stopIncludes: ["**7914", "**7915"] },
        },
      ],
    },
  },
  "38-cfr-4.149-4.150-1994-dental": {
    authorityRelPath: "authorities/part-4/38-cfr-4.150-dental-tmj-evolution.md",
    filters: [{ h2Num: 2 }],
    excerptScopeKey: "dental-9900-9905",
    excerptScopeLabel: "DC 9900 Osteomyelitis/Osteonecrosis & DC 9905 Temporomandibular Disorder",
  },
  "38-cfr-4.150-2017-dental-tmd": {
    authorityRelPath: "authorities/part-4/38-cfr-4.150-dental-tmj-evolution.md",
    filters: [{ h2Num: 3 }],
    scopedExcerpts: {
      "dental-9900-9905": [
        {
          h2Num: 3,
          sectionHeaderSlice: { startIncludes: "**9900", stopIncludes: ["**9901"] },
        },
        {
          h2Num: 3,
          sectionHeaderSlice: { startIncludes: "**9905", stopIncludes: ["**9908"] },
        },
      ],
    },
  },
};

export function enrichUpstreamCfrRecords(rawVersions: CfrVersionRecord[]): CfrVersionRecord[] {
  const out: CfrVersionRecord[] = [];

  const summaryOnlyOverrides = new Set<string>([
    "38-cfr-4.118-2008-scars",
    "38-cfr-4.118-2018-scars",
    "38-cfr-4.16-1975-base",
    "38-cfr-4.132-1988-psychoneurotic",
    "38-cfr-4.130-1996-dsm4",
    "38-cfr-3.22-2000-interpretive",
    "38-cfr-3.155-3.157b-2015-repeal",
    "38-cfr-3.159-2001-vcaa-duty-to-assist",
    "38-cfr-3.700a-2002-after-tax-recoupment",
    "38-cfr-3.55-2006-age57",
    "38-cfr-3.55-2022-age55",
    "38-cfr-4.85-4.87-1987-cnc-hearing",
    "38-cfr-4.71a-5055-2015-total-prosthesis",
    "38-cfr-part-4-vasrd-1946-base",
  ]);

  for (const v of rawVersions) {
    if (v.version_id === "38-cfr-4.118-2002-scars") {
      out.push({
        version_id: "38-cfr-4.118-1946-pre1978",
        cfr_section: "38 C.F.R. § 4.118",
        heading:
          "Schedule of ratings—skin (1946–1978 Original Looseleaf & 29 FR 6718 Scar Baseline Prior to 43 FR 45362)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "29 FR 6718 (May 22, 1964) (1945 VASRD eff. Apr. 1, 1946)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "1978-10-01",
        supersedes: null,
        superseded_by: "38-cfr-4.118-1978-pre2002",
        applicability_and_transition_notes:
          "Structured summary for pre-October 2, 1978 scar and disfigurement ratings under the original 1945 Schedule (29 FR 6718) prior to the 43 FR 45362 revision. Pull contemporaneous pre-1978 GovInfo print 38 C.F.R. § 4.118 before pleading CUE on a pre-October 2, 1978 decision.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.118-1978-pre2002",
        cfr_section: "38 C.F.R. § 4.118",
        heading:
          "Schedule of ratings—skin (1978–2002 Qualitative Disfigurement & Single 10% DC 7804 Print Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "43 FR 45362 (Oct. 2, 1978) (amending 29 FR 6718, May 22, 1964)",
        publication_date: "1978-10-02",
        effective_from: "1978-10-02",
        effective_to: "2002-08-29",
        supersedes: "38-cfr-4.118-1946-pre1978",
        superseded_by: "38-cfr-4.118-2002-scars",
        applicability_and_transition_notes:
          "Governs scar and disfigurement CUE motions attacking final rating decisions rendered from October 2, 1978 through August 29, 2002. Evaluated DC 7800 head/face/neck disfigurement on qualitative tiers (0/10/30/50%, with step-up note to 80%) and capped superficial painful scars under DC 7804 at a single 10% evaluation.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-4.118-1978-pre2002",
      });
    } else if (v.version_id === "38-cfr-3.12-pre2024-cod") {
      out.push({
        version_id: "38-cfr-3.12-1963-pre2022-cod",
        cfr_section: "former 38 C.F.R. § 3.12(a)–(k)",
        heading: "Character of discharge (1963–2022 Sub-Amendments Prior to Space Force Nomenclature)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "28 FR 123 (Jan. 4, 1963), as amended at 41 FR 12656 (Mar. 26, 1976), 43 FR 15153 (Apr. 11, 1978), 45 FR 2318 (Jan. 11, 1980), 49 FR 44099 (Nov. 2, 1984), and 62 FR 14823 (Mar. 28, 1997)",
        publication_date: "1963-01-04",
        effective_from: "1963-01-04",
        effective_to: "2022-05-02",
        supersedes: null,
        superseded_by: "38-cfr-3.12-pre2024-cod",
        applicability_and_transition_notes:
          "Structured summary for pre-May 3, 2022 COD decisions (e.g., 1978 Pub. L. 95-126 special-upgrade bars at 43 FR 15153 and 1982 entry-level uncharacterized separation additions). Consult the contemporaneous annual GovInfo print 38 C.F.R. § 3.12 edition before pleading CUE on a pre-May 3, 2022 decision.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        heading: "Character of discharge (2022–2024 Pre-Overhaul Print Text)",
        federal_register_citation: "87 FR 26125 (May 3, 2022) (amending 28 FR 123, Jan. 4, 1963)",
        publication_date: "2022-05-03",
        effective_from: "2022-05-03",
        supersedes: "38-cfr-3.12-1963-pre2022-cod",
      });
    } else if (v.version_id === "38-cfr-3.13-1961-conditional-discharge") {
      out.push({
        ...v,
        effective_to: "2022-05-02",
        superseded_by: "38-cfr-3.13-2022-current",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.13-2022-current",
        cfr_section: v.cfr_section,
        heading: "Discharge to change status (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation: "87 FR 26125 (May 3, 2022) (amending 43 FR 15154, Apr. 11, 1978)",
        publication_date: "2022-05-03",
        effective_from: "2022-05-03",
        effective_to: "present",
        supersedes: "38-cfr-3.13-1961-conditional-discharge",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.6-duty-periods") {
      out.push({
        ...v,
        publication_date: "1961-02-24",
        effective_to: "2022-05-02",
        superseded_by: "38-cfr-3.6-2022-duty-periods",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.6-2022-duty-periods",
        cfr_section: v.cfr_section,
        heading: "Duty periods (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "87 FR 26125 (May 3, 2022) (amending 66 FR 48560, Sept. 21, 2001 & 67 FR 49585, July 31, 2002)",
        publication_date: "2022-05-03",
        effective_from: "2022-05-03",
        effective_to: "present",
        supersedes: "38-cfr-3.6-duty-periods",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.350a7-2002-breast-smck") {
      out.push({
        version_id: "38-cfr-3.350a7-2000-statutory-mastectomy",
        cfr_section: "former 38 C.F.R. § 3.350(a)(7)",
        heading:
          "Special monthly compensation ratings — Statutory Pre-Codification Breast SMC(k) Window (Pub. L. 106-419, § 302)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "Pub. L. 106-419, § 302 (114 Stat. 1822, 1853, Nov. 1, 2000) (codified in CFR at 67 FR 6872, Feb. 14, 2002, eff. Mar. 18, 2002)",
        publication_date: "2002-02-14",
        effective_from: "2000-11-01",
        effective_to: "2002-03-17",
        supersedes: null,
        superseded_by: "38-cfr-3.350a7-2000-pre2002-mastectomy",
        applicability_and_transition_notes:
          "Statutory pre-codification period (Nov. 1, 2000 – Mar. 17, 2002) under Pub. L. 106-419, § 302 awarding SMC(k) for anatomical loss of one or both breasts in women prior to the March 18, 2002 regulatory effective date of former 38 C.F.R. § 3.350(a)(7) (67 FR 6872).",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.350a7-2000-pre2002-mastectomy",
        cfr_section: "former 38 C.F.R. § 3.350(a)(7)",
        heading:
          "Special monthly compensation ratings — Verbatim Excerpt: Former § 3.350(a)(7) Complete Mastectomy Rule (Mar.–Dec. 2002)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "67 FR 6872, 6873 (Feb. 14, 2002) (corrected at 67 FR 37695, May 30, 2002; implementing Pub. L. 106-419, § 302)",
        publication_date: "2002-02-14",
        effective_from: "2002-03-18",
        effective_to: "2002-12-05",
        supersedes: "38-cfr-3.350a7-2000-statutory-mastectomy",
        superseded_by: "38-cfr-3.350a7-2002-statutory-25pct",
        applicability_and_transition_notes:
          "Enacted CFR print text of former § 3.350(a)(7) in force from March 18, 2002 through December 5, 2002 restricting anatomical loss of a breast to radical, modified radical, or simple/total mastectomy.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        version_id: "38-cfr-3.350a7-2002-statutory-25pct",
        cfr_section: "38 C.F.R. § 3.350(a) & former § 3.350(a)(7)",
        heading:
          "Special monthly compensation ratings — Statutory >=25% Breast Tissue Loss or Radiation Lag Window (Pub. L. 107-330, § 102)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "Pub. L. 107-330, § 102 (116 Stat. 2820, Dec. 6, 2002) (codified in CFR at 68 FR 55467, Sept. 26, 2003)",
        publication_date: "2003-09-26",
        effective_from: "2002-12-06",
        effective_to: "2003-09-25",
        supersedes: "38-cfr-3.350a7-2000-pre2002-mastectomy",
        superseded_by: "38-cfr-3.350a7-2002-breast-smck",
        applicability_and_transition_notes:
          "Statutory lag period (Dec. 6, 2002 – Sept. 25, 2003): Pub. L. 107-330, § 102 amended 38 U.S.C. § 1114(k) effective December 6, 2002 to award SMC(k) for >=25% breast tissue loss (single or combined) or radiation treatment of breast tissue, superseding the lagging print text of former § 3.350(a)(7) prior to VA's September 26, 2003 conforming rule (68 FR 55467).",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        heading:
          "Special monthly compensation ratings (§ 3.350(a) >=25% Breast Tissue Loss or Radiation Rule — 68 FR 55467 Print Text)",
        federal_register_citation:
          "68 FR 55467 (Sept. 26, 2003) (removing former § 3.350(a)(7) & conforming § 3.350(a) to Pub. L. 107-330, § 102)",
        publication_date: "2003-09-26",
        effective_from: "2003-09-26",
        supersedes: "38-cfr-3.350a7-2002-statutory-25pct",
      });
    } else if (v.version_id === "38-cfr-3.350f-1961-barry-steps") {
      out.push({
        ...v,
        effective_to: "1983-09-13",
        superseded_by: "38-cfr-3.350f-1983-barry-steps",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.350f-1983-barry-steps",
        cfr_section: v.cfr_section,
        heading:
          "Special monthly compensation ratings — Intermediate or next higher rate (§ 3.350(f)(1)–(5) Current Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "48 FR 41161 (Sept. 14, 1983) (adding paragraph (f)(5); amending 26 FR 1587, Feb. 24, 1961 & 28 FR 1587, Feb. 20, 1963)",
        publication_date: "1983-09-14",
        effective_from: "1983-09-14",
        effective_to: "present",
        supersedes: "38-cfr-3.350f-1961-barry-steps",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.810-2011-sursely-clothing") {
      out.push({
        ...v,
        effective_to: "2012-06-10",
        superseded_by: "38-cfr-3.810-2012-sursely-clothing",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.810-2012-sursely-clothing",
        cfr_section: v.cfr_section,
        heading: "Clothing allowance (Multiple Annual Clothing Allowances — Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "77 FR 34218 (June 11, 2012) (amending 76 FR 70883, 70885, Nov. 16, 2011)",
        publication_date: "2012-06-11",
        effective_from: "2012-06-11",
        effective_to: "present",
        supersedes: "38-cfr-3.810-2011-sursely-clothing",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.310b-2006-secondary-aggravation") {
      out.push({
        version_id: "38-cfr-3.310-1979-era1a",
        cfr_section: "former 38 C.F.R. § 3.310(a)–(b)",
        heading: "Proximate results, secondary conditions (Original 1979–2001 Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "44 FR 50339, 50340 (Aug. 28, 1979)",
        publication_date: "1979-08-28",
        effective_from: "1979-08-28",
        effective_to: "2001-05-06",
        supersedes: null,
        superseded_by: "38-cfr-3.310-2001-era1b",
        applicability_and_transition_notes:
          "Promulgated § 3.310(a) general proximate causation and § 3.310(b) post-amputation cardiovascular disease. Construed in Allen v. Brown, 7 Vet. App. 439 (1995) (en banc) to mandate secondary service connection for aggravation of nonservice-connected disabilities under 38 U.S.C. §§ 1110/1131 prior to the Oct. 10, 2006 regulatory codification of § 3.310(b).",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        version_id: "38-cfr-3.310-2001-era1b",
        cfr_section: "former 38 C.F.R. § 3.310(a)–(b)",
        heading:
          "Proximate results, secondary conditions (2001–2006 § 3.300(c) Tobacco Cross-Reference Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "66 FR 18195, 18198 (Apr. 6, 2001) (amending 44 FR 50340, Aug. 28, 1979)",
        publication_date: "2001-04-06",
        effective_from: "2001-05-07",
        effective_to: "2006-10-09",
        supersedes: "38-cfr-3.310-1979-era1a",
        superseded_by: "38-cfr-3.310b-2006-secondary-aggravation",
        applicability_and_transition_notes:
          "Published April 6, 2001, effective May 7, 2001: inserted 'Except as provided in § 3.300(c),' at the beginning of § 3.310(a) while preserving secondary service connection for tobacco-related disabilities proximately caused by an already service-connected condition.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-3.310-2001-era1b",
      });
    } else if (v.version_id === "38-cfr-3.304b-2005-wagner-soundness") {
      out.push({
        version_id: "38-cfr-3.304b-1961-pre2005-soundness",
        cfr_section: "former 38 C.F.R. § 3.304(b)",
        heading:
          "Direct service connection; wartime and peacetime — Presumption of soundness (Pre-May 4, 2005 Single-Prong Text Invalidated in Wagner)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "26 FR 1580 (Feb. 24, 1961)",
        publication_date: "1961-02-24",
        effective_from: "1961-02-24",
        effective_to: "2005-05-03",
        supersedes: null,
        superseded_by: "38-cfr-3.304b-2005-wagner-soundness",
        applicability_and_transition_notes:
          "Historical pre-May 4, 2005 CFR text omitting 'and was not aggravated by such service' from the § 3.304(b) rebuttal clause. Invalidated under 38 U.S.C. § 1111 in Wagner v. Principi, 370 F.3d 1089 (Fed. Cir. 2004), but held in George v. McDonough, 596 U.S. 740 (2022) not to support CUE (38 C.F.R. § 20.1403(e)) against final pre-Wagner decisions that applied the regulation as written.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-3.304b-1961-pre2005-soundness",
      });
    } else if (v.version_id === "38-cfr-3.304f-1993-ptsd-base") {
      out.push({
        ...v,
        heading:
          "Direct service connection; wartime and peacetime — Post-traumatic stress disorder (Original 1993 Text)",
        federal_register_citation: "58 FR 29109, 29110 (May 19, 1993)",
        effective_to: "1999-06-17",
        superseded_by: "38-cfr-3.304f-1999-cohen-combat-pow",
      });
      out.push({
        version_id: "38-cfr-3.304f-1999-cohen-combat-pow",
        cfr_section: "former 38 C.F.R. § 3.304(f)(1)–(2)",
        heading:
          "Direct service connection; wartime and peacetime — Post-traumatic stress disorder (1999 § 4.125(a) DSM-IV & Numbered Combat/POW Subparagraphs)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "64 FR 32807, 32808 (June 18, 1999)",
        publication_date: "1999-06-18",
        effective_from: "1999-06-18",
        effective_to: "2002-03-06",
        supersedes: "38-cfr-3.304f-1993-ptsd-base",
        superseded_by: "38-cfr-3.304f-2002-mst-assault",
        applicability_and_transition_notes:
          "Published and effective June 18, 1999 following Cohen v. Brown, 10 Vet. App. 128 (1997): inserted 'meeting the criteria of diagnostic codes 9411 of the rating schedule (§ 4.125(a) of this chapter)' and structured numbered paragraphs (f)(1) (combat stressor rule) and (f)(2) (former prisoner-of-war stressor rule).",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.304f-2002-mst-assault") {
      out.push({
        ...v,
        supersedes: "38-cfr-3.304f-1999-cohen-combat-pow",
      });
    } else if (v.version_id === "38-cfr-3.22-1979-pre2000") {
      out.push({
        ...v,
        heading:
          "DIC benefits for survivors of certain veterans rated totally disabled at time of death (1978–1989 Original Text Prior to 'For Any Reason' Clause)",
        federal_register_citation:
          "44 FR 22718 (Apr. 17, 1979), as amended at 48 FR 41161 (Sept. 14, 1983) and 53 FR 23235 (June 21, 1988)",
        effective_to: "1989-08-01",
        superseded_by: "38-cfr-3.22-1989-pre2000",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.22-1989-pre2000",
        cfr_section: "former 38 C.F.R. § 3.22(a)",
        heading:
          "DIC benefits for survivors of certain veterans rated totally disabled at time of death — Verbatim Excerpt: § 3.22(a) ('For Any Reason' Era, 1989–2000)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "54 FR 31829 (Aug. 2, 1989) (implementing Pub. L. 100-687, § 1403)",
        publication_date: "1989-08-02",
        effective_from: "1989-08-02",
        effective_to: "2000-01-20",
        supersedes: "38-cfr-3.22-1979-pre2000",
        superseded_by: "38-cfr-3.22-2000-interpretive",
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.22-2000-interpretive") {
      out.push({
        ...v,
        supersedes: "38-cfr-3.22-1989-pre2000",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    } else if (v.version_id === "38-cfr-3.22-2005-2012-current") {
      out.push({
        ...v,
        heading:
          "DIC benefits for survivors of certain veterans rated totally disabled at time of death (2005–2012 § 3.22(b)(2) Service-Record Rule Prior to POW Date Removal)",
        federal_register_citation:
          "70 FR 72211, 72220 (Dec. 2, 2005), as amended at 71 FR 44918 (Aug. 8, 2006)",
        effective_to: "2012-07-09",
        superseded_by: "38-cfr-3.22-2012-current",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.22-2012-current",
        cfr_section: v.cfr_section,
        heading:
          "DIC benefits for survivors of certain veterans rated totally disabled at time of death (Current Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "77 FR 40525, 40526 (July 10, 2012) (amending 70 FR 72220, Dec. 2, 2005)",
        publication_date: "2012-07-10",
        effective_from: "2012-07-10",
        effective_to: "present",
        supersedes: "38-cfr-3.22-2005-2012-current",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.312-1961-cause-of-death") {
      out.push({
        ...v,
        effective_to: "1989-10-17",
        superseded_by: "38-cfr-3.312-1989-cause-of-death",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.312-1989-cause-of-death",
        cfr_section: v.cfr_section,
        heading: "Cause of death (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "54 FR 42803 (Oct. 18, 1989) (amending 26 FR 1582, Feb. 24, 1961 & 54 FR 34981, Aug. 23, 1989)",
        publication_date: "1989-10-18",
        effective_from: "1989-10-18",
        effective_to: "present",
        supersedes: "38-cfr-3.312-1961-cause-of-death",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.344-1961-stabilization") {
      out.push({
        ...v,
        effective_to: "1993-10-17",
        superseded_by: "38-cfr-3.344-1993-stabilization",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.344-1993-stabilization",
        cfr_section: v.cfr_section,
        heading: "Stabilization of disability evaluations (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "58 FR 53660 (Oct. 18, 1993) (amending 26 FR 1586, Feb. 24, 1961)",
        publication_date: "1993-10-18",
        effective_from: "1993-10-18",
        effective_to: "present",
        supersedes: "38-cfr-3.344-1961-stabilization",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.951-1969-preservation") {
      out.push({
        ...v,
        effective_to: "1992-03-25",
        superseded_by: "38-cfr-3.951-1992-preservation",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.951-1992-preservation",
        cfr_section: v.cfr_section,
        heading: "Preservation of disability ratings (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "57 FR 10426 (Mar. 26, 1992) (amending 34 FR 11970, July 16, 1969)",
        publication_date: "1992-03-26",
        effective_from: "1992-03-26",
        effective_to: "present",
        supersedes: "38-cfr-3.951-1969-preservation",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.953-1961-savings") {
      out.push({
        ...v,
        effective_to: "1961-12-29",
        superseded_by: "38-cfr-3.953-1961-dec-savings",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.953-1961-dec-savings",
        cfr_section: v.cfr_section,
        heading: "Pub. L. 85-56 and Pub. L. 85-857 (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "26 FR 12766 (Dec. 30, 1961) (amending 26 FR 1608, Feb. 24, 1961 & 26 FR 8561, Sept. 13, 1961)",
        publication_date: "1961-12-30",
        effective_from: "1961-12-30",
        effective_to: "present",
        supersedes: "38-cfr-3.953-1961-savings",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.321b1-pre2018-collective") {
      out.push({
        version_id: "38-cfr-3.321b1-1961-pre1996-collective",
        cfr_section: v.cfr_section,
        heading:
          "General rating considerations — Exceptional cases; Compensation (1961–1996 Pre-61 FR 20727 Collective Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "26 FR 1583 (Feb. 24, 1961), as amended at 37 FR 10442 (May 23, 1972) and 39 FR 5315 (Feb. 12, 1974)",
        publication_date: "1961-02-24",
        effective_from: "1961-02-24",
        effective_to: "1996-05-07",
        supersedes: null,
        superseded_by: "38-cfr-3.321b1-1996-pre2014-collective",
        applicability_and_transition_notes:
          "Structured summary for pre-May 8, 1996 extraschedular referral decisions under 26 FR 1583, 37 FR 10442, and 39 FR 5315 prior to the May 8, 1996 textual revision (61 FR 20727). Pull contemporaneous GovInfo print 38 C.F.R. § 3.321(b)(1) before pleading CUE on a pre-May 8, 1996 decision.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.321b1-1996-pre2014-collective",
        cfr_section: v.cfr_section,
        heading:
          "General rating considerations — Exceptional cases; Compensation (1996–2014 'Compensation and Pension Service' Collective Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "61 FR 20727 (May 8, 1996) (amending 26 FR 1583, Feb. 24, 1961)",
        publication_date: "1996-05-08",
        effective_from: "1996-05-08",
        effective_to: "2014-02-11",
        supersedes: "38-cfr-3.321b1-1961-pre1996-collective",
        superseded_by: "38-cfr-3.321b1-2014-pre2018-collective",
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        version_id: "38-cfr-3.321b1-2014-pre2018-collective",
        heading:
          "General rating considerations — Exceptional cases; Compensation (2014–2018 'Compensation Service' Collective Text)",
        federal_register_citation: "79 FR 2100 (Jan. 13, 2014) (amending 61 FR 20727, May 8, 1996)",
        publication_date: "2014-01-13",
        effective_from: "2014-02-12",
        effective_to: "2018-01-07",
        supersedes: "38-cfr-3.321b1-1996-pre2014-collective",
        superseded_by: "38-cfr-3.321b1-2018-single-disability",
      });
    } else if (v.version_id === "38-cfr-3.321b1-2018-single-disability") {
      out.push({
        ...v,
        supersedes: "38-cfr-3.321b1-2014-pre2018-collective",
      });
    } else if (v.version_id === "38-cfr-4.29-4.30-1989-temp-total") {
      out.push({
        ...v,
        effective_to: "2014-02-11",
        superseded_by: "38-cfr-4.29-4.30-2014-temp-total",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.29-4.30-2014-temp-total",
        cfr_section: v.cfr_section,
        heading:
          "Ratings for service-connected disabilities requiring hospital treatment or observation & Convalescent ratings (Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "79 FR 2100 (Jan. 13, 2014) (amending 54 FR 4281, Jan. 30, 1989 & 71 FR 28586, May 17, 2006)",
        publication_date: "2014-01-13",
        effective_from: "2014-02-12",
        effective_to: "present",
        supersedes: "38-cfr-4.29-4.30-1989-temp-total",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.1000-1962-pre2003-2yr-cap") {
      out.push({
        ...v,
        heading:
          "Entitlement under 38 U.S.C. 5121 to benefits due and unpaid upon death — Verbatim Excerpt: § 3.1000(a) Two-Year Cap",
      });
    } else if (v.version_id === "38-cfr-3.1000-2006-uncapped") {
      out.push({
        ...v,
        heading:
          "Entitlement under 38 U.S.C. 5121 to benefits due and unpaid upon death (2003–2015 Uncapped Rule Prior to § 3.1000(d)(4))",
        federal_register_citation: "71 FR 78368, 78369 (Dec. 29, 2006)",
        effective_to: "2015-04-02",
        superseded_by: "38-cfr-3.1000-2015-uncapped",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.1000-2015-uncapped",
        cfr_section: v.cfr_section,
        heading:
          "Entitlement under 38 U.S.C. 5121 to benefits due and unpaid upon death (Current Text Including § 3.1000(d)(4))",
        regulatory_status: "final-effective",
        federal_register_citation:
          "80 FR 18116, 18117 (Apr. 3, 2015) (amending 71 FR 78369, Dec. 29, 2006)",
        publication_date: "2015-04-03",
        effective_from: "2015-04-03",
        effective_to: "present",
        supersedes: "38-cfr-3.1000-2006-uncapped",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.816-2003-nehmer") {
      out.push({
        ...v,
        cfr_section: "38 C.F.R. § 3.816(f)(1)–(4)",
        heading:
          "Awards under the Nehmer Court Orders — Verbatim Excerpt: § 3.816(f)(1)–(4) (2003–2021 Prior-Release Bar)",
      });
    } else if (v.version_id === "38-cfr-3.816-2021-nehmer-payee") {
      out.push({
        ...v,
        cfr_section: "38 C.F.R. § 3.816",
        heading:
          "Awards under the Nehmer Court Orders — Verbatim Excerpt: § 3.816(f)(1)–(4) (Post-Dec. 2, 2021 Payee Rule)",
      });
    } else if (v.version_id === "38-cfr-3.400o2-2015-2019-itf") {
      out.push({
        ...v,
        heading:
          "General — Increases; Disability compensation (2015–2019 Complete Claim / ITF 1-Year Lookback Prior to AMA Intro)",
        federal_register_citation: "79 FR 57660, 57697 (Sept. 25, 2014) (RIN 2900-AO81)",
        effective_to: "2019-02-18",
        superseded_by: "38-cfr-3.400o2-2019-ama-intro",
      });
      out.push({
        version_id: "38-cfr-3.400o2-2019-ama-intro",
        cfr_section: v.cfr_section,
        heading:
          "General — Increases; Disability compensation (Current AMA Intro & Complete Claim / ITF 1-Year Lookback)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "84 FR 138, 170 (Jan. 18, 2019) & 84 FR 4336 (Feb. 15, 2019) (amending 79 FR 57697, Sept. 25, 2014)",
        publication_date: "2019-01-18",
        effective_from: "2019-02-19",
        effective_to: "present",
        supersedes: "38-cfr-3.400o2-2015-2019-itf",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.2500-2019-ama-continuous-pursuit") {
      out.push({
        ...v,
        heading: "Review of decisions (Feb.–Oct. 2019 Initial AMA Rule Including Legacy RAMP Text)",
        federal_register_citation: "84 FR 138, 170–171 (Jan. 18, 2019) & 84 FR 4336 (Feb. 15, 2019)",
        effective_to: "2019-10-08",
        superseded_by: "38-cfr-3.2500-2019-oct-ama",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.2500-2019-oct-ama",
        cfr_section: v.cfr_section,
        heading:
          "Review of decisions (AMA Administrative Lanes & Continuous Pursuit — Current Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "84 FR 54033 (Oct. 9, 2019) (removing RAMP opt-in paragraph and redesignating (c)–(h); amending 84 FR 170, Jan. 18, 2019)",
        publication_date: "2019-10-09",
        effective_from: "2019-10-09",
        effective_to: "present",
        supersedes: "38-cfr-3.2500-2019-ama-continuous-pursuit",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.159-2019-ama-duty-to-assist") {
      out.push({
        ...v,
        heading:
          "Department of Veterans Affairs assistance in developing claims (2019–2022 AMA Text Prior to § 3.320 & Space Force Updates)",
        federal_register_citation:
          "84 FR 138, 169 (Jan. 18, 2019) & 84 FR 4336 (Feb. 15, 2019), as amended at 86 FR 42732 (Aug. 5, 2021)",
        effective_to: "2022-05-02",
        superseded_by: "38-cfr-3.159-2022-ama-duty-to-assist",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-3.159-2022-ama-duty-to-assist",
        cfr_section: v.cfr_section,
        heading:
          "Department of Veterans Affairs assistance in developing claims (Current AMA Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "87 FR 26125 (May 3, 2022) (amending 84 FR 169, Jan. 18, 2019 & 86 FR 42732, Aug. 5, 2021)",
        publication_date: "2022-05-03",
        effective_from: "2022-05-03",
        effective_to: "present",
        supersedes: "38-cfr-3.159-2019-ama-duty-to-assist",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-20.1400-1999-subpart-o-board-cue") {
      out.push({
        ...v,
        heading:
          "Revision of Decisions on Grounds of Clear and Unmistakable Error (1999–2001 Original Enactment Prior to DAV v. Gober Amendment)",
        federal_register_citation: "64 FR 2134, 2139–2140 (Jan. 13, 1999)",
        effective_to: "2001-07-09",
        superseded_by: "38-cfr-20.1400-2001-gober-legacy-cue",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-20.1400-2001-gober-legacy-cue",
        cfr_section: v.cfr_section,
        heading:
          "Revision of Decisions on Grounds of Clear and Unmistakable Error (2001–2019 Post-Gober Dismissal Without Prejudice Rule)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "66 FR 35903 (July 10, 2001) (amending 64 FR 2139, Jan. 13, 1999)",
        publication_date: "2001-07-10",
        effective_from: "2001-07-10",
        effective_to: "2019-02-18",
        supersedes: "38-cfr-20.1400-1999-subpart-o-board-cue",
        superseded_by: "38-cfr-20.1400-2019-ama-subpart-o-cue",
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-20.1400-2019-ama-subpart-o-cue",
        cfr_section: v.cfr_section,
        heading:
          "Revision of Decisions on Grounds of Clear and Unmistakable Error (Current Post-AMA Subpart O Rules 1400, 1403, 1404 & 1409)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "84 FR 138, 191–192 (Jan. 18, 2019) & 84 FR 4336 (Feb. 15, 2019) (amending 64 FR 2139, Jan. 13, 1999 & 66 FR 35903, July 10, 2001)",
        publication_date: "2019-01-18",
        effective_from: "2019-02-19",
        effective_to: "present",
        supersedes: "38-cfr-20.1400-2001-gober-legacy-cue",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-part-71-2020-pcafc-and-17.4020c") {
      out.push({
        ...v,
        heading:
          "Program of Comprehensive Assistance for Family Caregivers (2020–2025 MISSION Act Text Prior to Sept. 2028 Legacy Extension)",
        federal_register_citation:
          "85 FR 46226, 46293–46300 (July 31, 2020), as amended at 86 FR 52614 (Sept. 22, 2021) and 87 FR 57602 (Sept. 21, 2022)",
        effective_to: "2025-09-29",
        superseded_by: "38-cfr-part-71-2025-pcafc-and-17.4020c",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-part-71-2025-pcafc-and-17.4020c",
        cfr_section: v.cfr_section,
        heading:
          "Program of Comprehensive Assistance for Family Caregivers (PCAFC Current Text Through Sept. 30, 2028 Extension)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "90 FR 46477 (Sept. 29, 2025) (amending 85 FR 46293, July 31, 2020)",
        publication_date: "2025-09-29",
        effective_from: "2025-09-30",
        effective_to: "present",
        supersedes: "38-cfr-part-71-2020-pcafc-and-17.4020c",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-4.71a-2002-ivds") {
      out.push({
        version_id: "38-cfr-4.71a-1946-pre2002-spine",
        cfr_section: "former 38 C.F.R. § 4.71a (DC 5285–5295)",
        heading:
          "Schedule of ratings—musculoskeletal system (Pre-Sept. 23, 2002 Qualitative Spine & DC 5285–5295 Schedule)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "29 FR 6718 (May 22, 1964) (1945 VASRD eff. Apr. 1, 1946)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "2002-09-22",
        supersedes: null,
        superseded_by: "38-cfr-4.71a-2002-ivds",
        applicability_and_transition_notes:
          "Governs spine CUE motions attacking final rating decisions rendered prior to September 23, 2002 (and non-IVDS spine ratings through September 25, 2003): evaluated vertebral fracture residuals (DC 5285), ankylosis (DC 5286–5289), qualitative slight/moderate/severe limitation of motion (DC 5290–5292), recurring IVDS attacks (DC 5293), sacroiliac injury (DC 5294), and lumbosacral strain (DC 5295). For pre-2015 non-spine joint/prosthetic ratings, pull contemporaneous GovInfo print 38 C.F.R. § 4.71a.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        heading:
          "Schedule of ratings—musculoskeletal system (2002–2003 Interim DC 5293 Incapacitating-Episodes Rule + DC 5285–5295 Spine Schedule)",
        supersedes: "38-cfr-4.71a-1946-pre2002-spine",
      });
    } else if (v.version_id === "38-cfr-4.71a-2003-spine") {
      out.push({
        ...v,
        effective_to: "2015-07-15",
        superseded_by: "38-cfr-4.71a-joints-pre2021",
      });
    } else if (v.version_id === "38-cfr-4.71a-2021-musculoskeletal") {
      out.push({
        ...v,
        supersedes: "38-cfr-4.71a-joints-pre2021",
      });
    } else if (v.version_id === "38-cfr-4.100-4.104-1998-cardio-lvef") {
      out.push({
        version_id: "38-cfr-4.100-4.104-1946-pre1998-cardio",
        cfr_section: "former 38 C.F.R. §§ 4.100 & 4.104",
        heading:
          "Schedule of ratings—cardiovascular system — Verbatim Excerpt: Pre-Jan. 12, 1998 DC 7005 Qualitative Heart Schedule",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "29 FR 6718 (May 22, 1964), as amended at 40 FR 42536 (Sept. 15, 1975) and 52 FR 44119 (Nov. 18, 1987)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "1998-01-11",
        supersedes: null,
        superseded_by: "38-cfr-4.100-4.104-1998-cardio-lvef",
        applicability_and_transition_notes:
          "Governs cardiovascular CUE motions and pre-Jan. 12, 1998 Nehmer DC 7005 retro-audits: evaluated arteriosclerotic heart disease (DC 7005) using qualitative congestive-failure, angina, and 'precluding more than light manual labor' (60%) tiers prior to the 1998 METs/LVEF overhaul.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        heading:
          "Schedule of ratings—cardiovascular system — Verbatim Excerpt: 1998–2006 DC 7005 METs & LVEF Schedule (Prior to Oct. 6, 2006 § 4.100(a)–(c))",
        federal_register_citation: "62 FR 65207 (Dec. 11, 1997)",
        effective_to: "2006-10-05",
        supersedes: "38-cfr-4.100-4.104-1946-pre1998-cardio",
        superseded_by: "38-cfr-4.100-4.104-2006-mets-4100",
      });
      out.push({
        version_id: "38-cfr-4.100-4.104-2006-mets-4100",
        cfr_section: "former 38 C.F.R. §§ 4.100 & 4.104",
        heading:
          "Application of evaluation criteria (§ 4.100(a)–(c)) & DC 7005 Heart Schedule (2006–2021 METs + LVEF Era)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "71 FR 52457, 52460 (Sept. 6, 2006) (adding § 4.100(a)–(c) to 62 FR 65207, Dec. 11, 1997)",
        publication_date: "2006-09-06",
        effective_from: "2006-10-06",
        effective_to: "2021-11-13",
        supersedes: "38-cfr-4.100-4.104-1998-cardio-lvef",
        superseded_by: "38-cfr-4.100-4.104-2021-cardio-mets",
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-4.100-4.104-2021-cardio-mets") {
      out.push({
        ...v,
        supersedes: "38-cfr-4.100-4.104-2006-mets-4100",
      });
    } else if (v.version_id === "38-cfr-4.104-7122-1998-cold-injury") {
      out.push({
        ...v,
        heading:
          "Schedule of ratings—cardiovascular system (DC 7122 Cold Injury Residuals — 1998–2021 Notes)",
        federal_register_citation: "63 FR 37778 (July 14, 1998)",
        effective_to: "2021-11-13",
        superseded_by: "38-cfr-4.104-7122-2021-notes",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.104-7122-2021-notes",
        cfr_section: v.cfr_section,
        heading:
          "Schedule of ratings—cardiovascular system (DC 7122 Cold Injury Residuals — Streamlined 2021 Notes (1)–(2))",
        regulatory_status: "final-effective",
        federal_register_citation:
          "86 FR 54089, 54097 (Sept. 30, 2021) (amending 63 FR 37778, July 14, 1998)",
        publication_date: "2021-09-30",
        effective_from: "2021-11-14",
        effective_to: "present",
        supersedes: "38-cfr-4.104-7122-1998-cold-injury",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-4.124a-8045-pre2008-tbi") {
      out.push({
        version_id: "38-cfr-4.124a-8045-1946-pre1996-tbi",
        cfr_section: v.cfr_section,
        heading:
          "Schedule of ratings—neurological conditions (Pre-Nov. 7, 1996 DC 8045 Brain Disease Due to Trauma)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "29 FR 6718 (May 22, 1964), as amended at 43 FR 45362 (Oct. 2, 1978)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "1996-11-06",
        supersedes: null,
        superseded_by: "38-cfr-4.124a-8045-pre2008-tbi",
        applicability_and_transition_notes:
          "Pre-Nov. 7, 1996 print text prior to the 61 FR 52700 DSM-IV cross-reference nomenclature update ('dementia due to head trauma' / 'multi-infarct dementia'); capped purely subjective post-traumatic complaints at 10%.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        heading:
          "Schedule of ratings—neurological conditions (1996–2008 DC 8045 Brain Disease Due to Trauma — 10% Subjective Cap)",
        federal_register_citation: "61 FR 52695, 52700 (Oct. 8, 1996) (amending 43 FR 45362)",
        publication_date: "1996-10-08",
        effective_from: "1996-11-07",
        supersedes: "38-cfr-4.124a-8045-1946-pre1996-tbi",
      });
    } else if (v.version_id === "38-cfr-4.124a-8045-2008-tbi-facets") {
      out.push({
        ...v,
        heading:
          "Schedule of ratings—neurological conditions (2008–2014 DC 8045 10-Facet TBI Table — DSM-IV Note (1) Text)",
        federal_register_citation:
          "73 FR 54693 (Sept. 23, 2008) (technical correction at 73 FR 69554, Nov. 19, 2008)",
        effective_to: "2014-08-03",
        superseded_by: "38-cfr-4.124a-8045-2014-dsm5-tbi",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.124a-8045-2014-dsm5-tbi",
        cfr_section: v.cfr_section,
        heading:
          "Schedule of ratings—neurological conditions (Current DC 8045 10-Facet TBI Schedule & DSM-5 Note (1))",
        regulatory_status: "final-effective",
        federal_register_citation:
          "79 FR 45093 (Aug. 4, 2014) (updating DC 9304 DSM-5 nomenclature in 73 FR 54693, Sept. 23, 2008)",
        publication_date: "2014-08-04",
        effective_from: "2014-08-04",
        effective_to: "present",
        supersedes: "38-cfr-4.124a-8045-2008-tbi-facets",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-4.124a-8017-2012-als-100") {
      out.push({
        version_id: "38-cfr-4.124a-8017-1946-pre2012-als",
        cfr_section: "former 38 C.F.R. § 4.124a (DC 8017)",
        heading:
          "Schedule of ratings—neurological conditions and convulsive disorders (Pre-Jan. 19, 2012 30% Minimum ALS Schedule)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "29 FR 6718 (May 22, 1964) (1945 VASRD eff. Apr. 1, 1946)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "2012-01-18",
        supersedes: null,
        superseded_by: "38-cfr-4.124a-8017-2012-als-100",
        applicability_and_transition_notes:
          "Assigned a 30% minimum rating under DC 8017 Amyotrophic Lateral Sclerosis prior to January 19, 2012 while requiring proportionate higher evaluation of progressive bulbar, extremity, respiratory, and aid-and-attendance residuals.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-4.124a-8017-1946-pre2012-als",
      });
    } else if (v.version_id === "38-cfr-4.87-6260-2003-tinnitus-single") {
      out.push({
        version_id: "38-cfr-4.87-6260-1946-pre1999-trauma",
        cfr_section: "former 38 C.F.R. § 4.87a (DC 6260)",
        heading:
          "Schedule of ratings—ear (Pre-June 10, 1999 Persistent Head-Injury / Acoustic-Trauma Tinnitus Rule)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "29 FR 6718 (May 22, 1964) (1945 VASRD eff. Apr. 1, 1946)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "1999-06-09",
        supersedes: null,
        superseded_by: "38-cfr-4.87-6260-1999-recurrent",
        applicability_and_transition_notes:
          "Governed DC 6260 Tinnitus prior to June 10, 1999 under former § 4.87a: required persistent tinnitus as a symptom of head injury, concussion, or acoustic trauma.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        version_id: "38-cfr-4.87-6260-1999-recurrent",
        cfr_section: "former 38 C.F.R. § 4.87 (DC 6260)",
        heading:
          "Schedule of ratings—ear (1999–2003 Recurrent Tinnitus Text Prior to Single-Evaluation Note (2))",
        regulatory_status: "repealed-historical",
        federal_register_citation: "64 FR 25202, 25210 (May 11, 1999)",
        publication_date: "1999-05-11",
        effective_from: "1999-06-10",
        effective_to: "2003-06-12",
        supersedes: "38-cfr-4.87-6260-1946-pre1999-trauma",
        superseded_by: "38-cfr-4.87-6260-2003-tinnitus-single",
        applicability_and_transition_notes:
          "Published May 11, 1999, effective June 10, 1999: removed the trauma/concussion etiology restriction in favor of 'Tinnitus, recurrent — 10' with Notes (1)–(2), prior to the June 13, 2003 addition of explicit single-evaluation Note (2) (upheld in Smith v. Nicholson, 451 F.3d 1344 (Fed. Cir. 2006)).",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-4.87-6260-1999-recurrent",
      });
    } else if (v.version_id === "38-cfr-4.88a-4.88b-2019-infectious-cfs") {
      out.push({
        version_id: "38-cfr-4.88a-4.88b-1996-infectious",
        cfr_section: "former 38 C.F.R. §§ 4.88a & 4.88b",
        heading:
          "Chronic fatigue syndrome & Schedule of ratings—infectious diseases, immune disorders and nutritional deficiencies (1996–2019 Schedule)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "61 FR 39873, 39875 (July 31, 1996) (incorporating § 4.88a / DC 6354 CFS from 59 FR 60902, Nov. 29, 1994)",
        publication_date: "1996-07-31",
        effective_from: "1996-08-30",
        effective_to: "2019-08-10",
        supersedes: null,
        superseded_by: "38-cfr-4.88a-4.88b-2019-infectious-cfs",
        applicability_and_transition_notes:
          "Governed infectious diseases, HIV-related illness (DC 6351), lupus (DC 6350), Lyme disease (DC 6319), malaria (DC 6304), FPOW nutritional deficiencies (DC 6313–6315), and CFS (DC 6354) from August 30, 1996 through August 10, 2019 prior to the 2019 General Rating Formula overhaul.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-4.88a-4.88b-1996-infectious",
      });
    } else if (v.version_id === "38-cfr-4.96-4.97-1996-respiratory") {
      out.push({
        version_id: "38-cfr-4.96-4.97-1946-pre1996-respiratory",
        cfr_section: "former 38 C.F.R. §§ 4.96 & 4.97",
        heading:
          "Schedule of ratings—respiratory system — Verbatim Excerpt: Pre-Oct. 7, 1996 DC 6602 Qualitative Asthma Schedule",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "29 FR 6718 (May 22, 1964), as amended at 40 FR 42537 (Sept. 15, 1975) and 54 FR 4281 (Jan. 30, 1989)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "1996-10-06",
        supersedes: null,
        superseded_by: "38-cfr-4.96-4.97-1996-respiratory",
        applicability_and_transition_notes:
          "Governed respiratory evaluations prior to October 7, 1996 using qualitative attack-frequency and dyspnea descriptors before the 1996 PFT/FEV-1/DLCO and DC 6847 Sleep Apnea overhaul.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        heading:
          "Special provisions & Schedule of ratings—respiratory system (1996–2006 PFT & DC 6847 Schedule Prior to § 4.96(d))",
        federal_register_citation: "61 FR 46720 (Sept. 5, 1996)",
        effective_to: "2006-05-16",
        supersedes: "38-cfr-4.96-4.97-1946-pre1996-respiratory",
        superseded_by: "38-cfr-4.96-4.97-2006-may-tech",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.96-4.97-2006-may-tech",
        cfr_section: v.cfr_section,
        heading:
          "Special provisions (§ 4.96(a)–(c)) & Schedule of ratings—respiratory system (May–Oct. 2006 Print Text Prior to § 4.96(d) PFT Exceptions)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "71 FR 28586 (May 17, 2006) (amending 61 FR 46720, Sept. 5, 1996)",
        publication_date: "2006-05-17",
        effective_from: "2006-05-17",
        effective_to: "2006-10-05",
        supersedes: "38-cfr-4.96-4.97-1996-respiratory",
        superseded_by: "38-cfr-4.96-4.97-2006-pft-exceptions",
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        version_id: "38-cfr-4.96-4.97-2006-pft-exceptions",
        cfr_section: v.cfr_section,
        heading:
          "Special provisions (§ 4.96(a)–(d)) & Schedule of ratings—respiratory system (Current PFT Application & DC 6847 Schedule)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "71 FR 52457, 52459 (Sept. 6, 2006) (adding § 4.96(d)(1)–(7); amending 61 FR 46720 & 71 FR 28586)",
        publication_date: "2006-09-06",
        effective_from: "2006-10-06",
        effective_to: "present",
        supersedes: "38-cfr-4.96-4.97-2006-may-tech",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-4.117-2018-hemic-lymphatic") {
      out.push({
        version_id: "38-cfr-4.117-1995-hemic-lymphatic",
        cfr_section: "former 38 C.F.R. § 4.117",
        heading:
          "Schedule of ratings—hemic and lymphatic systems (1995–2014 Schedule Prior to DC 7717 / Nomenclature Print Edition)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "60 FR 49225, 49227 (Sept. 22, 1995), as amended at 77 FR 6467 (Feb. 8, 2012, eff. Mar. 9, 2012)",
        publication_date: "1995-09-22",
        effective_from: "1995-10-23",
        effective_to: "2014-02-11",
        supersedes: null,
        superseded_by: "38-cfr-4.117-2014-pre2018-hemic",
        applicability_and_transition_notes:
          "Governed hemic and lymphatic ratings from October 23, 1995 through February 11, 2014 (DC 7717 AL Amyloidosis 100% took effect March 9, 2012 at 77 FR 6467; pull pre-2012 print 38 C.F.R. § 4.117 when auditing 1995–2012 decisions).",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.117-2014-pre2018-hemic",
        cfr_section: "former 38 C.F.R. § 4.117",
        heading:
          "Schedule of ratings—hemic and lymphatic systems (2014–2018 GovInfo Print Edition Including DC 7717 AL Amyloidosis)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "79 FR 2100 (Jan. 13, 2014) & 77 FR 6467 (Feb. 8, 2012) (amending 60 FR 49227, Sept. 22, 1995)",
        publication_date: "2014-01-13",
        effective_from: "2014-02-12",
        effective_to: "2018-12-08",
        supersedes: "38-cfr-4.117-1995-hemic-lymphatic",
        superseded_by: "38-cfr-4.117-2018-hemic-lymphatic",
        applicability_and_transition_notes:
          "Verbatim 2014–2018 print schedule (DC 7700–7717), including 100% for all active leukemia under DC 7703 (prior to Dec. 9, 2018 CLL Stage 0 split), 6-month post-treatment 100% floor under DC 7715 NHL, and 100% DC 7717 AL Amyloidosis.",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        supersedes: "38-cfr-4.117-2014-pre2018-hemic",
      });
    } else if (v.version_id === "38-cfr-4.16a-1990-marginal") {
      out.push({
        ...v,
        heading:
          "Total disability ratings for compensation based on unemployability of the individual (1990–2014 'Compensation and Pension Service' Print Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "55 FR 31579, 31580 (Aug. 3, 1990) (tech. update at 58 FR 39664, July 26, 1993)",
        effective_to: "2014-02-11",
        superseded_by: "38-cfr-4.16a-2014-current",
      });
      out.push({
        version_id: "38-cfr-4.16a-2014-current",
        cfr_section: v.cfr_section,
        heading:
          "Total disability ratings for compensation based on unemployability of the individual (Current 'Director, Compensation Service' Print Text)",
        regulatory_status: "final-effective",
        federal_register_citation:
          "79 FR 2100 (Jan. 13, 2014) (updating nomenclature in 55 FR 31580, Aug. 3, 1990)",
        publication_date: "2014-01-13",
        effective_from: "2014-02-12",
        effective_to: "present",
        supersedes: "38-cfr-4.16a-1990-marginal",
        superseded_by: null,
        applicability_and_transition_notes: v.applicability_and_transition_notes,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
    } else if (v.version_id === "38-cfr-3.55-2006-age57") {
      out.push({
        ...v,
        effective_to: "2021-01-04",
        superseded_by: "38-cfr-3.55-2021-statutory-age55",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    } else if (v.version_id === "38-cfr-3.55-2022-age55") {
      out.push({
        version_id: "38-cfr-3.55-2021-statutory-age55",
        cfr_section: v.cfr_section,
        heading:
          "Reinstatement of benefits eligibility based upon terminated marital relationships — Statutory Age-55 DIC Remarriage Lag Window (Pub. L. 116-315, § 2009)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "Pub. L. 116-315, § 2009 (134 Stat. 4932, 4978, Jan. 5, 2021) (codified in CFR at 87 FR 68360, Nov. 15, 2022)",
        publication_date: "2022-11-15",
        effective_from: "2021-01-05",
        effective_to: "2022-11-14",
        supersedes: "38-cfr-3.55-2006-age57",
        superseded_by: "38-cfr-3.55-2022-age55",
        applicability_and_transition_notes:
          "Statutory lag period (Jan. 5, 2021 – Nov. 14, 2022): Pub. L. 116-315, § 2009 lowered the remarriage age threshold for retaining Chapter 13 DIC from age 57 to age 55 for remarriages occurring on or after January 5, 2021, superseding the lagging age-57 print text of § 3.55 prior to the November 15, 2022 conforming CFR rule (87 FR 68360).",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        effective_from: "2022-11-15",
        supersedes: "38-cfr-3.55-2021-statutory-age55",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    } else if (v.version_id === "38-cfr-3.700a-2002-after-tax-recoupment") {
      out.push({
        ...v,
        effective_to: "2008-01-27",
        superseded_by: "38-cfr-3.700a3-2008-statutory-combat",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    } else if (v.version_id === "38-cfr-3.700a3-2009-combat-severance") {
      out.push({
        version_id: "38-cfr-3.700a3-2008-statutory-combat",
        cfr_section: v.cfr_section,
        heading:
          "General — Statutory Combat-Zone Disability Severance Non-Recoupment Lag Window (Pub. L. 110-181, § 1646)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "Pub. L. 110-181, § 1646 (10 U.S.C. § 1212(d)(2), Jan. 28, 2008) (codified in CFR at 74 FR 26956, June 5, 2009)",
        publication_date: "2009-06-05",
        effective_from: "2008-01-28",
        effective_to: "2009-06-04",
        supersedes: "38-cfr-3.700a-2002-after-tax-recoupment",
        superseded_by: "38-cfr-3.700a3-2009-combat-severance",
        applicability_and_transition_notes:
          "Statutory lag period (Jan. 28, 2008 – June 4, 2009): Pub. L. 110-181, § 1646 (10 U.S.C. § 1212(d)(2)) barred VA recoupment of disability severance pay for Chapter 61 separations on or after January 28, 2008 incurred in a combat zone or combat-related operations prior to VA's June 5, 2009 conforming CFR rule (74 FR 26956).",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        heading:
          "General — Severance pay, Separation pay & SSB (June 5, 2009 CFR Rule Implementing Pub. L. 110-181 Combat-Zone Non-Recoupment)",
        effective_from: "2009-06-05",
        supersedes: "38-cfr-3.700a3-2008-statutory-combat",
      });
    } else if (v.version_id === "38-cfr-3.274-3.275-pre2018-corpus") {
      out.push({
        version_id: "38-cfr-3.274-3.275-1979-pre1992-corpus",
        cfr_section: v.cfr_section,
        heading:
          "Relationship of net worth to pension entitlement & Criteria for evaluating net worth (1979–1992 Pre-57 FR 59299 Improved Pension Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "44 FR 45936 (Aug. 6, 1979), as amended at 56 FR 65847 (Dec. 19, 1991)",
        publication_date: "1979-08-06",
        effective_from: "1979-01-01",
        effective_to: "1992-12-14",
        supersedes: null,
        superseded_by: "38-cfr-3.274-3.275-pre2018-corpus",
        applicability_and_transition_notes:
          "Structured summary for pre-December 15, 1992 Improved Pension net-worth determinations prior to the 57 FR 59299 revision. Pull contemporaneous GovInfo print 38 C.F.R. §§ 3.274–3.275 before pleading CUE on a pre-December 15, 1992 decision.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        heading:
          "Relationship of net worth to pension entitlement & Criteria for evaluating net worth (1992–2018 Facts-and-Circumstances Print Text)",
        federal_register_citation:
          "57 FR 59299 (Dec. 15, 1992) (amending 44 FR 45936, Aug. 6, 1979 & 56 FR 65847, Dec. 19, 1991)",
        publication_date: "1992-12-15",
        effective_from: "1992-12-15",
        supersedes: "38-cfr-3.274-3.275-1979-pre1992-corpus",
      });
    } else if (v.version_id === "38-cfr-1.963b2-pre2026-180day-waiver") {
      out.push({
        version_id: "38-cfr-1.963b2-1983-pre1993-waiver",
        cfr_section: v.cfr_section,
        heading:
          "Waiver; other than loan guaranty (1983–1993 Pre-58 FR 3840 180-Day Waiver Text)",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "48 FR 27400 (June 15, 1983), as amended at 50 FR 38803 (Sept. 25, 1985)",
        publication_date: "1983-06-15",
        effective_from: "1983-04-01",
        effective_to: "1993-01-11",
        supersedes: null,
        superseded_by: "38-cfr-1.963b2-pre2026-180day-waiver",
        applicability_and_transition_notes:
          "Structured summary for April 1, 1983 – January 11, 1993 overpayment waiver requests prior to the January 12, 1993 amendment (58 FR 3840). Pull contemporaneous GovInfo print 38 C.F.R. § 1.963(b) before pleading CUE on a pre-January 12, 1993 decision.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        heading:
          "Waiver; other than loan guaranty (1993–2026 180-Day Regulatory Waiver Window Print Text)",
        federal_register_citation:
          "58 FR 3840 (Jan. 12, 1993) (amending 48 FR 27400, June 15, 1983 & 50 FR 38803, Sept. 25, 1985)",
        publication_date: "1993-01-12",
        effective_from: "1993-01-12",
        supersedes: "38-cfr-1.963b2-1983-pre1993-waiver",
      });
    } else if (v.version_id === "38-cfr-4.71a-joints-pre2021") {
      out.push({
        ...v,
        cfr_section: "former 38 C.F.R. § 4.71a",
        heading:
          "Schedule of ratings—musculoskeletal system (2015–2021 ROM Spine + Pre-2021 Joints, Arthritis & Total-Prosthesis Print Schedule)",
        federal_register_citation:
          "80 FR 42040, 42041 (July 16, 2015) & 68 FR 51454 (Aug. 27, 2003) (amending 29 FR 6718 & 40 FR 42536; 2016–2020 GovInfo print 38 C.F.R. § 4.71a)",
        publication_date: "2015-07-16",
        effective_from: "2015-07-16",
        effective_to: "2021-02-06",
        supersedes: "38-cfr-4.71a-2003-spine",
        superseded_by: "38-cfr-4.71a-2021-musculoskeletal",
      });
    } else if (v.version_id === "38-cfr-4.115a-4.115b-1994-gu") {
      out.push({
        version_id: "38-cfr-4.115a-4.115b-1994-feb-gu",
        cfr_section: v.cfr_section,
        heading:
          "Nephritis & Ratings of the genitourinary system (Feb.–Sept. 1994 Initial Enactment Prior to SMC Footnote 1 Technical Amendment)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "59 FR 2523, 2526–2529 (Jan. 18, 1994)",
        publication_date: "1994-01-18",
        effective_from: "1994-02-17",
        effective_to: "1994-09-07",
        supersedes: null,
        superseded_by: "38-cfr-4.115a-4.115b-1994-gu",
        applicability_and_transition_notes:
          "Initial Feb. 17 – Sept. 7, 1994 genitourinary schedule prior to the September 8, 1994 technical amendment (59 FR 46338, 46339) attaching § 3.350 SMC Footnote 1 to DC 7520–7524.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        ...v,
        federal_register_citation:
          "59 FR 46338, 46339 (Sept. 8, 1994) (amending 59 FR 2526, Jan. 18, 1994)",
        publication_date: "1994-09-08",
        effective_from: "1994-09-08",
        supersedes: "38-cfr-4.115a-4.115b-1994-feb-gu",
      });
    } else if (v.version_id === "38-cfr-4.118-skin-2002-7806") {
      out.push({
        version_id: "38-cfr-4.118-skin-1946-pre1978-7806",
        cfr_section: "former 38 C.F.R. § 4.118 (DC 7806–7833)",
        heading:
          "Schedule of ratings—skin (1946–1978 Original Looseleaf & 29 FR 6718 Dermatological Baseline Prior to 43 FR 45362)",
        regulatory_status: "repealed-historical",
        federal_register_citation: "29 FR 6718 (May 22, 1964) (1945 VASRD eff. Apr. 1, 1946)",
        publication_date: "1964-05-22",
        effective_from: "1946-04-01",
        effective_to: "1978-10-01",
        supersedes: null,
        superseded_by: "38-cfr-4.118-skin-1978-pre2002-7806",
        applicability_and_transition_notes:
          "Structured summary for pre-October 2, 1978 non-scar dermatological ratings under 29 FR 6718 prior to the 43 FR 45362 revision. Pull contemporaneous pre-1978 GovInfo print 38 C.F.R. § 4.118 before pleading CUE on a pre-October 2, 1978 decision.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
      out.push({
        version_id: "38-cfr-4.118-skin-1978-pre2002-7806",
        cfr_section: "former 38 C.F.R. § 4.118 (DC 7806–7833)",
        heading:
          "Schedule of ratings—skin — Verbatim Excerpt: 1978–2002 DC 7806 Eczema & DC 7816 Psoriasis Print Text",
        regulatory_status: "repealed-historical",
        federal_register_citation:
          "43 FR 45362 (Oct. 2, 1978) (amending 29 FR 6718, May 22, 1964)",
        publication_date: "1978-10-02",
        effective_from: "1978-10-02",
        effective_to: "2002-08-29",
        supersedes: "38-cfr-4.118-skin-1946-pre1978-7806",
        superseded_by: "38-cfr-4.118-skin-2002-7806",
        applicability_and_transition_notes:
          "Governed non-scar dermatological evaluations (DC 7806 Eczema, DC 7816 Psoriasis, DC 7809 Discoid Lupus, DC 7817 Exfoliative Dermatitis) from October 2, 1978 through August 29, 2002 using qualitative ulceration/crusting/exudation descriptors (50/30/10/0%).",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      });
      out.push({
        ...v,
        heading:
          "Schedule of ratings—skin — Verbatim Excerpt: 2002–2018 DC 7806 Body-Area & Systemic Therapy Formula",
        supersedes: "38-cfr-4.118-skin-1978-pre2002-7806",
      });
    } else if (summaryOnlyOverrides.has(v.version_id)) {
      out.push({
        ...v,
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    } else {
      out.push(v);
    }

    // Quarantined proposed-nonbinding watchlist attachments onto enacted sections
    if (v.version_id === "38-cfr-4.118-2018-scars") {
      out.push({
        version_id: "38-cfr-4.118-2025-proposed-pain",
        cfr_section: "38 C.F.R. § 4.118",
        heading:
          "Schedule for Rating Disabilities: Skin — DC 7804 Objective Pain Note (Proposed Rule — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation: "90 FR 46542 (Sept. 29, 2025)",
        publication_date: "2025-09-29",
        effective_from: "2025-09-29",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking published September 29, 2025 (90 FR 46542) proposing to add a note to DC 7804 requiring objective confirmation of pain upon examination or demonstration. Remains unfinalized / not enacted law and must NEVER be cited as an active regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
    if (v.version_id === "38-cfr-4.96-4.97-1996-respiratory") {
      out.push({
        version_id: "38-cfr-4.96-4.97-2022-proposed-sleep-apnea",
        cfr_section: v.cfr_section,
        heading:
          "Schedule for Rating Disabilities: Respiratory System & DC 6847 Sleep Apnea (Proposed Rule & SNPRM — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation:
          "87 FR 8474 (Feb. 15, 2022) & 89 FR 74162 (Sept. 12, 2024) (RIN 2900-AQ72)",
        publication_date: "2022-02-15",
        effective_from: "2022-02-15",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking (87 FR 8474) and Supplemental NPRM (89 FR 74162, RIN 2900-AQ72) proposing to revise DC 6847 Sleep Apnea CPAP criteria and add DC 6605 constrictive bronchiolitis. Remains proposed / not enacted law and must NEVER be cited as binding regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
    if (v.version_id === "38-cfr-4.87-6260-2003-tinnitus-single") {
      out.push({
        version_id: "38-cfr-4.87-6260-2022-proposed-tinnitus",
        cfr_section: v.cfr_section,
        heading:
          "Schedule for Rating Disabilities: Ear, Nose, Throat, and Audiology — DC 6260 Tinnitus (Proposed Rule — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation: "87 FR 8474 (Feb. 15, 2022) (RIN 2900-AQ72)",
        publication_date: "2022-02-15",
        effective_from: "2022-02-15",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking published February 15, 2022 (87 FR 8474, RIN 2900-AQ72) proposing to eliminate standalone DC 6260 recurrent tinnitus evaluations as a symptom of underlying pathology. Remains proposed / not enacted law and must NEVER be cited as binding regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
    if (
      v.version_id === "38-cfr-4.124a-8045-2008-tbi-facets" ||
      v.version_id === "38-cfr-4.124a-8017-2012-als-100"
    ) {
      out.push({
        version_id:
          v.version_id === "38-cfr-4.124a-8045-2008-tbi-facets"
            ? "38-cfr-4.124a-8045-2024-proposed-neuro"
            : "38-cfr-4.124a-8017-2024-proposed-neuro",
        cfr_section: v.cfr_section,
        heading:
          "Schedule for Rating Disabilities: Neurological Conditions and Convulsive Disorders (Proposed Rule — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation: "89 FR 88917 (Nov. 12, 2024) (RIN 2900-AQ73)",
        publication_date: "2024-11-12",
        effective_from: "2024-11-12",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking published November 12, 2024 (89 FR 88917, RIN 2900-AQ73) proposing to revise §§ 4.120–4.124a neurological and peripheral nerve grading criteria. Remains proposed / not enacted law and must NEVER be cited as binding regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
    if (v.version_id === "38-cfr-4.130-2014-dsm5") {
      out.push({
        version_id: "38-cfr-4.130-2022-proposed-mental",
        cfr_section: v.cfr_section,
        heading:
          "Schedule for Rating Disabilities: Mental Disorders — Five-Domain Formula (Proposed Rule — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation: "87 FR 8498 (Feb. 15, 2022) (RIN 2900-AQ82)",
        publication_date: "2022-02-15",
        effective_from: "2022-02-15",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking published February 15, 2022 (87 FR 8498, RIN 2900-AQ82) proposing a 5-domain General Rating Formula for Mental Disorders and eliminating the 0% mental evaluation tier. Remains proposed / not enacted law and must NEVER be cited as binding regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
    if (v.version_id === "38-cfr-4.116-2018-gyn-breast") {
      out.push({
        version_id: "38-cfr-4.116-2025-proposed-endometriosis",
        cfr_section: v.cfr_section,
        heading:
          "Schedule for Rating Disabilities: Gynecological Conditions — DC 7629 Endometriosis Laparoscopy Note (Proposed Rule — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation: "90 FR 47266 (Oct. 1, 2025) (RIN 2900-AS39)",
        publication_date: "2025-10-01",
        effective_from: "2025-10-01",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking published October 1, 2025 (90 FR 47266, RIN 2900-AS39) proposing to eliminate the laparoscopy substantiation requirement in DC 7629 Endometriosis. Remains proposed / not enacted law and must NEVER be cited as binding regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
    if (v.version_id === "38-cfr-part-71-2020-pcafc-and-17.4020c") {
      out.push({
        version_id: "38-cfr-part-71-2024-proposed-pcafc",
        cfr_section: v.cfr_section,
        heading:
          "Program of Comprehensive Assistance for Family Caregivers (PCAFC) Amendments (Proposed Rule — Not Enacted)",
        regulatory_status: "proposed-nonbinding",
        federal_register_citation: "89 FR 97404 (Dec. 6, 2024) (RIN 2900-AR96)",
        publication_date: "2024-12-06",
        effective_from: "2024-12-06",
        effective_to: null,
        supersedes: null,
        superseded_by: null,
        applicability_and_transition_notes:
          "QUARANTINED UNFINALIZED PROPOSAL: Notice of Proposed Rulemaking published December 6, 2024 (89 FR 97404, RIN 2900-AR96) proposing revisions to 38 C.F.R. Part 71 PCAFC eligibility, reassessment, and stipend definitions. Remains proposed / not enacted law and must NEVER be cited as binding regulation.",
        verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
      });
    }
  }

  return out;
}

interface HierarchicalAuthorityBlock {
  h2Num: number;
  h2Title: string;
  h3Title: string;
  h4Title: string;
  quoteGroups: string[];
  embeddedTables: string[];
  trailingNote: string | null;
}

const SUPERSCRIPT_MAP: Readonly<Record<string, string>> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function normalizeVerbatimMarkdown(raw: string): string {
  return raw
    .replace(/\$\^\{(\d+)\}\$/g, (_m, digits: string) =>
      digits
        .split("")
        .map((d) => SUPERSCRIPT_MAP[d] ?? d)
        .join(""),
    )
    .replace(/^#{1,6}\s+(.+)$/gm, "**$1**")
    .trim();
}

function isEditorialAlertCallout(groupText: string): boolean {
  const firstLine =
    groupText
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  if (/^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(firstLine)) {
    return true;
  }
  if (
    /^\*\*(?:Judicial Invalidation|Citator Alert|QUARANTINE|Quarantined|Key Judicial|Archival Citator)/i.test(
      firstLine,
    )
  ) {
    return true;
  }
  return false;
}

function hasEditorialAbridgment(text: string): boolean {
  return /\*\((?:Retains the|Summarized from|Omitted here)/i.test(text);
}

function parseHierarchicalAuthorityBlocks(markdownContent: string): HierarchicalAuthorityBlock[] {
  const { content } = matter(markdownContent);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: HierarchicalAuthorityBlock[] = [];

  let currentH2Num: number | null = null;
  let currentH2Title = "";
  let currentH3Title = "";
  let currentH4Title = "";

  let activeQuoteLines: string[] = [];
  let quoteGroups: string[] = [];
  let embeddedTables: string[] = [];
  let noteLines: string[] = [];

  function flushQuoteGroup() {
    if (activeQuoteLines.length === 0) return;
    const joined = activeQuoteLines.join("\n").trim();
    activeQuoteLines = [];
    if (!joined) return;
    if (isEditorialAlertCallout(joined)) return;
    quoteGroups.push(joined);
  }

  function flushBlock() {
    flushQuoteGroup();
    if (
      currentH2Num !== null &&
      (quoteGroups.length > 0 || embeddedTables.length > 0)
    ) {
      blocks.push({
        h2Num: currentH2Num,
        h2Title: currentH2Title,
        h3Title: currentH3Title,
        h4Title: currentH4Title,
        quoteGroups,
        embeddedTables,
        trailingNote: noteLines.length > 0 ? noteLines.join(" ").trim() : null,
      });
    }
    quoteGroups = [];
    embeddedTables = [];
    noteLines = [];
  }

  let idx = 0;
  while (idx < lines.length) {
    const rawLine = lines[idx] ?? "";
    const trimmed = rawLine.trim();

    const h2Match = /^##\s+(\d+)\.\s+(.+)$/.exec(trimmed);
    if (h2Match) {
      flushBlock();
      currentH2Num = Number(h2Match[1]);
      currentH2Title = (h2Match[2] ?? "").replace(/`/g, "").trim();
      currentH3Title = "";
      currentH4Title = "";
      idx += 1;
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushBlock();
      currentH2Num = null;
      currentH2Title = "";
      currentH3Title = "";
      currentH4Title = "";
      idx += 1;
      continue;
    }

    if (currentH2Num !== null) {
      const h3Match = /^###\s+(.+)$/.exec(trimmed);
      if (h3Match) {
        flushBlock();
        currentH3Title = (h3Match[1] ?? "").replace(/`/g, "").trim();
        currentH4Title = "";
        idx += 1;
        continue;
      }

      const h4Match = /^####\s+(.+)$/.exec(trimmed);
      if (h4Match) {
        flushBlock();
        currentH4Title = (h4Match[1] ?? "").replace(/`/g, "").trim();
        idx += 1;
        continue;
      }

      if (rawLine.trimStart().startsWith(">")) {
        const unquoted = rawLine.trimStart().replace(/^>\s?/, "");
        if (unquoted.trim() === "---") {
          flushQuoteGroup();
        } else {
          activeQuoteLines.push(unquoted);
        }
        idx += 1;
        continue;
      }

      flushQuoteGroup();

      if (trimmed.startsWith("|") && (lines[idx + 1] ?? "").includes("---")) {
        const tableLines: string[] = [];
        while (idx < lines.length && (lines[idx] ?? "").trim().startsWith("|")) {
          tableLines.push((lines[idx] ?? "").trim());
          idx += 1;
        }
        if (tableLines.length >= 3) {
          embeddedTables.push(tableLines.join("\n"));
        }
        continue;
      }

      if (
        quoteGroups.length > 0 &&
        trimmed.startsWith("*(") &&
        !trimmed.startsWith("---")
      ) {
        const rawNoteLines: string[] = [trimmed];
        while (
          idx + 1 < lines.length &&
          !/\)\.?(\*)+$/.test(rawNoteLines[rawNoteLines.length - 1] ?? "")
        ) {
          const nextTrimmed = (lines[idx + 1] ?? "").trim();
          if (
            !nextTrimmed ||
            nextTrimmed.startsWith("#") ||
            nextTrimmed.startsWith("---") ||
            nextTrimmed.startsWith(">")
          ) {
            break;
          }
          idx += 1;
          rawNoteLines.push(nextTrimmed);
        }
        const cleanedNote = rawNoteLines
          .map((nl) => nl.replace(/\*{1,3}/g, ""))
          .join(" ")
          .replace(/^\(/, "")
          .replace(/\)\.?$/, "")
          .trim();
        if (cleanedNote) {
          noteLines.push(cleanedNote);
        }
      }
    }

    idx += 1;
  }

  flushBlock();
  return blocks;
}

function sliceQuoteByHeader(
  text: string,
  slice: NonNullable<AuthoritySectionFilter["sectionHeaderSlice"]>,
): string {
  const lines = text.split("\n");
  const startNeedle = slice.startIncludes.toLowerCase();
  const stopNeedles = (slice.stopIncludes ?? []).map((s) => s.toLowerCase());

  let startIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if ((lines[i] ?? "").toLowerCase().includes(startNeedle)) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return "";

  let endIdx = lines.length;
  if (stopNeedles.length > 0) {
    for (let i = startIdx + 1; i < lines.length; i += 1) {
      const rawLower = (lines[i] ?? "").toLowerCase();
      if (
        stopNeedles.some((stop) =>
          stop.startsWith("*") || stop.startsWith("#")
            ? rawLower.startsWith(stop)
            : rawLower.startsWith(stop) || rawLower.includes(stop),
        )
      ) {
        endIdx = i;
        break;
      }
    }
  }

  return lines.slice(startIdx, endIdx).join("\n").trim();
}

function runFiltersAgainstBlocks(
  defaultRelPath: string,
  filters: ReadonlyArray<AuthoritySectionFilter>,
  getBlocks: (relPath: string) => ReadonlyArray<HierarchicalAuthorityBlock>,
): { text: string; notes: string[] } {
  const parts: string[] = [];
  const notes: string[] = [];

  for (const filter of filters) {
    const blocks = getBlocks(filter.authorityRelPath ?? defaultRelPath);
    const matchedBlocks = blocks.filter((b) => {
      if (b.h2Num !== filter.h2Num) return false;
      if (filter.h3Includes !== undefined) {
        if (filter.h3Includes === "") {
          if (b.h3Title !== "") return false;
        } else {
          const needle = filter.h3Includes.toLowerCase();
          const lowerH3 = b.h3Title.toLowerCase();
          const alreadyNumbered = /^\d+\./.test(lowerH3);
          const candidate = alreadyNumbered ? lowerH3 : `${b.h2Num}.${lowerH3}`;
          const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const matchesH3 = /^\d+\.[a-z0-9]+$/i.test(needle)
            ? new RegExp(`(?:^|\\s)${escapedNeedle}(?=$|[\\s:.)-])`, "i").test(lowerH3) ||
              (!alreadyNumbered &&
                new RegExp(`^${escapedNeedle}(?=$|[\\s:.)-])`, "i").test(candidate))
            : lowerH3.includes(needle);
          if (!matchesH3) {
            return false;
          }
        }
      }
      if (
        filter.h4Includes !== undefined &&
        !b.h4Title.toLowerCase().includes(filter.h4Includes.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    for (const mb of matchedBlocks) {
      let groups = mb.quoteGroups;
      if (filter.quoteGroupIncludes) {
        const needle = filter.quoteGroupIncludes.toLowerCase();
        groups = groups.filter((g) => g.toLowerCase().includes(needle));
      }

      for (const g of groups) {
        let chunk = filter.sectionHeaderSlice
          ? sliceQuoteByHeader(g, filter.sectionHeaderSlice)
          : g;
        if (filter.textTransform && chunk) {
          chunk = filter.textTransform(chunk);
        }
        if (chunk.trim().length > 0) {
          parts.push(chunk.trim());
        }
      }

      if (filter.includeEmbeddedTables && mb.embeddedTables.length > 0) {
        for (const tbl of mb.embeddedTables) {
          parts.push(tbl);
        }
      }

      if (mb.trailingNote) {
        notes.push(mb.trailingNote);
      }
    }
  }

  return {
    text: normalizeVerbatimMarkdown(parts.join("\n\n")),
    notes,
  };
}

function extractVerbatimForSpec(
  spec: AuthorityVerbatimSpec,
  getBlocks: (relPath: string) => ReadonlyArray<HierarchicalAuthorityBlock>,
): {
  verbatimMarkdown: string | null;
  trailingNote: string | null;
  excerptScopeKey: string | null;
  excerptScopeLabel: string | null;
  scopedExcerpts: Record<string, string> | undefined;
} {
  const main = runFiltersAgainstBlocks(spec.authorityRelPath, spec.filters, getBlocks);
  if (!main.text || hasEditorialAbridgment(main.text)) {
    return {
      verbatimMarkdown: null,
      trailingNote: main.notes.length > 0 ? main.notes.join(" ") : null,
      excerptScopeKey: null,
      excerptScopeLabel: null,
      scopedExcerpts: undefined,
    };
  }

  let scopedExcerpts: Record<string, string> | undefined;
  if (spec.scopedExcerpts) {
    const built: Record<string, string> = {};
    for (const [scopeKey, scopeFilters] of Object.entries(spec.scopedExcerpts)) {
      const sub = runFiltersAgainstBlocks(spec.authorityRelPath, scopeFilters, getBlocks);
      if (sub.text && !hasEditorialAbridgment(sub.text)) {
        built[scopeKey] = sub.text;
      }
    }
    if (Object.keys(built).length > 0) {
      scopedExcerpts = built;
    }
  }

  return {
    verbatimMarkdown: main.text,
    trailingNote: main.notes.length > 0 ? main.notes.join(" ") : null,
    excerptScopeKey: spec.excerptScopeKey ?? null,
    excerptScopeLabel: spec.excerptScopeLabel ?? null,
    scopedExcerpts,
  };
}

function stripTableMarkdown(cell: string): string {
  return stripInlineMarkdownFormatting(cell);
}

function parseMarkdownTables(markdownContent: string, idPrefix: string): CfrTrapTable[] {
  const { content } = matter(markdownContent);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const tables: CfrTrapTable[] = [];

  let activeHeading = "Historical Comparison";
  let idx = 0;

  while (idx < lines.length) {
    const trimmed = (lines[idx] ?? "").trim();
    const hMatch = /^#{2,3}\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      activeHeading = stripInlineMarkdownFormatting(
        (hMatch[1] ?? "").replace(/\(See\s+\[.*$/i, "").trim(),
      );
      idx += 1;
      continue;
    }

    if (trimmed.startsWith("|") && (lines[idx + 1] ?? "").includes("---")) {
      const headers = trimmed
        .split("|")
        .slice(1, -1)
        .map(stripTableMarkdown);
      idx += 2;

      const rows: string[][] = [];
      while (idx < lines.length && (lines[idx] ?? "").trim().startsWith("|")) {
        const rowCells = (lines[idx] ?? "")
          .trim()
          .split("|")
          .slice(1, -1)
          .map(stripTableMarkdown);
        if (rowCells.length === headers.length) {
          rows.push(rowCells);
        }
        idx += 1;
      }

      if (headers.length >= 2 && rows.length > 0) {
        tables.push({
          id: `${idPrefix}-table-${tables.length + 1}`,
          title: activeHeading,
          headers,
          rows,
        });
      }
      continue;
    }

    idx += 1;
  }

  return tables;
}

function inferHeldWaveForSection(sectionSlug: string): string {
  if (
    sectionSlug.startsWith("38-cfr-3.105") ||
    sectionSlug.startsWith("38-cfr-3.155") ||
    sectionSlug.startsWith("38-cfr-3.157") ||
    sectionSlug.startsWith("38-cfr-3.344") ||
    sectionSlug.startsWith("38-cfr-3.655") ||
    sectionSlug.startsWith("38-cfr-3.95") ||
    sectionSlug.startsWith("38-cfr-4.16")
  ) {
    return "W2";
  }
  if (sectionSlug.startsWith("38-cfr-3.")) {
    return "W3";
  }
  return "W4";
}

function extractPrimaryPartSections(cfrText: string): Set<string> {
  const out = new Set<string>();
  const cleaned = cfrText.replace(/\((?!DC\b)[^)]*\)/gi, " ");
  for (const m of cleaned.matchAll(/\b(\d+\.\d+(?:a|b)?)\b/gi)) {
    if (m[1]) out.add(m[1].toLowerCase());
  }
  return out;
}

function inferPart4VasrdSystem(sectionSlug: string): string | null {
  if (sectionSlug.startsWith("38-cfr-part-4")) {
    return "part-4-general-policy";
  }
  const m = /^38-cfr-4\.(\d+)/i.exec(sectionSlug);
  if (!m) return null;
  const secNum = Number(m[1]);
  if (secNum >= 1 && secNum <= 31) return "part-4-general-policy";
  if (secNum >= 40 && secNum <= 73) return "01-musculoskeletal";
  if (secNum >= 75 && secNum <= 79) return "02-eye-vision";
  if (secNum >= 85 && secNum <= 87) return "03-auditory";
  if (secNum === 88) return "04-infectious-immune";
  if (secNum === 96 || secNum === 97) return "05-respiratory";
  if (secNum >= 100 && secNum <= 104) return "06-cardiovascular";
  if (secNum >= 110 && secNum <= 114) return "07-digestive";
  if (secNum === 115) return "08-genitourinary";
  if (secNum === 116) return "09-gynecological-breast";
  if (secNum === 117) return "10-hemic-lymphatic";
  if (secNum === 118) return "11-skin";
  if (secNum === 119) return "12-endocrine";
  if (secNum >= 120 && secNum <= 124) return "13-neurological";
  if (secNum >= 125 && secNum <= 132) return "14-mental-disorders";
  if (secNum === 149 || secNum === 150) return "15-dental-oral";
  return null;
}

const SUMMARY_ERA_NOTE_OVERRIDES: Readonly<Record<string, string>> = {
  "38-cfr-4.118-2008-scars":
    "Structured Summary Only for Oct. 23, 2008 – Aug. 12, 2018 (73 FR 54708): Deleted DC 7803, enacted count-based DC 7804 (1–2 = 10%, 3–4 = 20%, 5+ = 30%, +10% if both unstable and painful), and required 'nonlinear' configuration in DC 7801–7802. Consult the 2009–2018 annual GovInfo print 38 C.F.R. § 4.118 edition before pleading CUE on a decision rendered in this window.",
  "38-cfr-4.118-2018-scars":
    "Excerpted Schedule & Summary Notes for Aug. 13, 2018 – Present (83 FR 32592): Removed the 'nonlinear' restriction from DC 7801–7802, defined 6 non-head/face/neck body zones in DC 7801 Note (1), retained count-based DC 7804 (10/20/30% + 10% dual bonus) and the 8-characteristic DC 7800 matrix, and updated DC 7805. Verify full current wording on official eCFR before pleading CUE.",
};

export function extractCompiledCfrSections(params: {
  upstreamDir: string;
  compiledVersions: CompiledCfrVersion[];
  upstreamEntries: UpstreamIndexEntry[];
  overlays: Map<string, VeteranOverlay>;
  heldAtGateCount?: number;
  routeResolver?: (entry: UpstreamIndexEntry) => string;
}): CompiledCfrSection[] {
  const {
    upstreamDir,
    compiledVersions,
    upstreamEntries,
    overlays,
    heldAtGateCount = 0,
    routeResolver = (entry) => `/cfr/modules/${posix.basename(entry.path, ".md")}`,
  } = params;
  const entryById = new Map(upstreamEntries.map((e) => [e.id, e]));
  const entryByPath = new Map(
    upstreamEntries.map((e) => [e.path.replace(/\\/g, "/"), e]),
  );
  const wave1Map = new Map(WAVE_1_CFR_MAPPINGS.map((m) => [m.sectionSlug, m]));

  const parsedAuthorityCache = new Map<
    string,
    ReadonlyArray<HierarchicalAuthorityBlock>
  >();
  function getParsedAuthorityBlocks(relPath: string): ReadonlyArray<HierarchicalAuthorityBlock> {
    const normalized = relPath.replace(/\\/g, "/");
    const cached = parsedAuthorityCache.get(normalized);
    if (cached) return cached;
    const abs = join(upstreamDir, normalized);
    const parsed = existsSync(abs)
      ? parseHierarchicalAuthorityBlocks(readFileSync(abs, "utf8"))
      : [];
    parsedAuthorityCache.set(normalized, parsed);
    return parsed;
  }

  const versionsBySlug = new Map<string, CompiledCfrVersion[]>();
  for (const v of compiledVersions) {
    const arr = versionsBySlug.get(v.sectionSlug) ?? [];
    arr.push(v);
    versionsBySlug.set(v.sectionSlug, arr);
  }

  const sections: CompiledCfrSection[] = [];

  for (const [sectionSlug, rawList] of versionsBySlug.entries()) {
    const wave1 = wave1Map.get(sectionSlug);
    const activeHead =
      rawList.filter((v) => v.regulatory_status === "final-effective").slice(-1)[0] ??
      rawList[rawList.length - 1];
    const sampleCitation = wave1?.cfrSection ?? activeHead?.cfr_section;
    const fallbackUrls = buildOfficialFallbackUrls(sectionSlug, sampleCitation);

    if (wave1) {
      const diffAbs = wave1.diffRelPath ? join(upstreamDir, wave1.diffRelPath) : null;
      const diffMd = diffAbs && existsSync(diffAbs) ? readFileSync(diffAbs, "utf8") : "";
      const trapTables = diffMd ? parseMarkdownTables(diffMd, sectionSlug) : [];

      const authEntry = entryById.get(wave1.authorityModuleId);
      const diffEntry = wave1.diffModuleId ? entryById.get(wave1.diffModuleId) : undefined;

      const enactedList = rawList
        .filter(
          (v) =>
            v.regulatory_status === "final-effective" ||
            v.regulatory_status === "repealed-historical",
        )
        .sort((a, b) => a.effective_from.localeCompare(b.effective_from));

      const quarantinedRaw = rawList.filter(
        (v) =>
          v.regulatory_status === "proposed-nonbinding" ||
          v.regulatory_status === "interim-final-rescinded",
      );

      const versions: CompiledCfrSnapshot[] = enactedList.map((v) => {
        const spec = VERSION_VERBATIM_SELECTORS[v.version_id];
        const extracted =
          spec && v.verbatim_text_status !== "summary-only-pull-print-cfr-before-cue"
            ? extractVerbatimForSpec(spec, getParsedAuthorityBlocks)
            : {
                verbatimMarkdown: null,
                trailingNote: null,
                excerptScopeKey: null,
                excerptScopeLabel: null,
                scopedExcerpts: undefined,
              };

        const isSnapshotVerbatim = Boolean(extracted.verbatimMarkdown);
        const overrideNote = SUMMARY_ERA_NOTE_OVERRIDES[v.version_id] ?? null;

        return {
          ...v,
          applicability_and_transition_notes: v.applicability_and_transition_notes
            ? sanitizeSchemaTokens(v.applicability_and_transition_notes)
            : v.applicability_and_transition_notes,
          coverageState: isSnapshotVerbatim ? "VERBATIM_VERIFIED" : "SUMMARY_ONLY",
          bookmarkStatus: isSnapshotVerbatim ? "WAVE_1_LIVE_VERBATIM" : "SUMMARY_ONLY",
          heldWaveId: null,
          verbatimMarkdown: extracted.verbatimMarkdown,
          eraNote:
            overrideNote ??
            (extracted.trailingNote ? sanitizeSchemaTokens(extracted.trailingNote) : null),
          sourceModuleId: wave1.authorityModuleId,
          excerptScopeKey: extracted.excerptScopeKey,
          excerptScopeLabel: extracted.excerptScopeLabel,
          scopedExcerpts: extracted.scopedExcerpts,
        };
      });

      const quarantinedWatchlist: CompiledCfrSnapshot[] = quarantinedRaw.map((q) => {
        const cleanedNotes = q.applicability_and_transition_notes
          ? sanitizeSchemaTokens(q.applicability_and_transition_notes)
          : undefined;
        return {
          ...q,
          applicability_and_transition_notes: cleanedNotes,
          coverageState: "SUMMARY_ONLY",
          bookmarkStatus: "QUARANTINED_NONBINDING",
          heldWaveId: null,
          verbatimMarkdown: null,
          eraNote: cleanedNotes ?? null,
          sourceModuleId: wave1.authorityModuleId,
        };
      });

      const veteranOverlay = overlays.get(wave1.authorityModuleId) ?? null;
      const diffVeteranOverlay = wave1.diffModuleId
        ? (overlays.get(wave1.diffModuleId) ?? null)
        : null;

      const coverageState: CoverageState = veteranOverlay
        ? "VERBATIM_VERIFIED"
        : "PLAIN_ENGLISH_IN_PROGRESS";

      const killSwitches = Array.from(
        new Set([
          ...(authEntry?.kill_switches ?? []),
          ...(diffEntry?.kill_switches ?? []),
        ]),
      ).map(sanitizeSchemaTokens);
      const cFileTriggers = Array.from(
        new Set([
          ...(authEntry?.c_file_triggers ?? []),
          ...(diffEntry?.c_file_triggers ?? []),
        ]),
      ).map(sanitizeSchemaTokens);
      const keyPrecedents = Array.from(
        new Set([
          ...(authEntry?.key_precedents ?? []),
          ...(diffEntry?.key_precedents ?? []),
        ]),
      );
      const statutes = Array.from(
        new Set([...(authEntry?.statutes ?? []), ...(diffEntry?.statutes ?? [])]),
      );
      const diagnosticCodes = Array.from(
        new Set([
          ...(authEntry?.diagnostic_codes ?? []),
          ...(diffEntry?.diagnostic_codes ?? []),
        ]),
      );

      sections.push({
        sectionSlug,
        cfrSection: wave1.cfrSection,
        title: wave1.title,
        bookmarkStatus: "WAVE_1_LIVE_VERBATIM",
        heldWaveId: null,
        coverageState,
        vasrdSystem: authEntry?.vasrd_system ?? diffEntry?.vasrd_system ?? null,
        summary: wave1.summary,
        versions,
        quarantinedWatchlist,
        companionModules: [],
        killSwitches,
        cFileTriggers,
        keyPrecedents,
        statutes,
        diagnosticCodes,
        trapTables,
        veteranOverlay,
        diffVeteranOverlay,
        officialEcfrUrl: fallbackUrls.ecfrUrl,
        officialGovInfoUrl: fallbackUrls.govinfoUrl,
      });
      continue;
    }

    const enactedList = rawList
      .filter(
        (v) =>
          v.regulatory_status === "final-effective" ||
          v.regulatory_status === "repealed-historical",
      )
      .sort((a, b) => a.effective_from.localeCompare(b.effective_from));

    const quarantinedRaw = rawList.filter(
      (v) =>
        v.regulatory_status === "proposed-nonbinding" ||
        v.regulatory_status === "interim-final-rescinded",
    );

    const matchedEntriesMap = new Map<string, UpstreamIndexEntry>();

    for (const v of enactedList) {
      const spec = VERSION_VERBATIM_SELECTORS[v.version_id];
      if (spec) {
        const boundEntry = entryByPath.get(spec.authorityRelPath.replace(/\\/g, "/"));
        if (boundEntry) {
          matchedEntriesMap.set(boundEntry.id, boundEntry);
        }
        for (const f of spec.filters) {
          if (f.authorityRelPath) {
            const extra = entryByPath.get(f.authorityRelPath.replace(/\\/g, "/"));
            if (extra) matchedEntriesMap.set(extra.id, extra);
          }
        }
      }
    }

    for (const v of rawList) {
      const notes = v.applicability_and_transition_notes ?? "";
      for (const m of notes.matchAll(
        /\b((?:authorities|cfr-diffs)\/[a-z0-9./_-]+\.md)\b/gi,
      )) {
        const refPath = (m[1] ?? "").replace(/\\/g, "/");
        const found = entryByPath.get(refPath);
        if (found) {
          matchedEntriesMap.set(found.id, found);
        }
      }
    }

    const expectedVasrdSystem = inferPart4VasrdSystem(sectionSlug);
    const sectionPart = /^38-cfr-(?:part-)?(\d+)\b/i.exec(sectionSlug)?.[1] ?? "";
    const targetNums = new Set<string>();
    for (const v of rawList) {
      for (const num of extractPrimaryPartSections(v.cfr_section)) {
        targetNums.add(num);
      }
    }

    if (targetNums.size > 0) {
      for (const entry of upstreamEntries) {
        if (
          entry.category !== "authority-snapshot" &&
          entry.category !== "cfr-diff"
        ) {
          continue;
        }
        const entryRelPath = entry.path.replace(/\\/g, "/");

        if (expectedVasrdSystem !== null) {
          const isSharedTdiuDigestiveResp =
            entry.id === "cfr-diff-tdiu-digestive-respiratory" &&
            (sectionSlug.startsWith("38-cfr-4.16") ||
              sectionSlug.startsWith("38-cfr-4.96") ||
              sectionSlug.startsWith("38-cfr-4.110") ||
              sectionSlug.startsWith("38-cfr-4.114"));
          if (!isSharedTdiuDigestiveResp && entry.vasrd_system !== expectedVasrdSystem) {
            continue;
          }
        } else {
          const isExtraschedularPolicy =
            sectionSlug.startsWith("38-cfr-3.321") &&
            entry.vasrd_system === "part-4-general-policy";
          if (
            !isExtraschedularPolicy &&
            (entry.vasrd_system ||
              entryRelPath.startsWith("authorities/part-4/") ||
              entryRelPath.startsWith("cfr-diffs/vasrd/"))
          ) {
            continue;
          }
        }

        const primarySubjectNums = new Set<string>([
          ...extractPrimaryPartSections(entryRelPath),
          ...extractPrimaryPartSections(entry.title),
          ...(entry.cfr_citations ?? [])
            .slice(0, 3)
            .flatMap((cite) => Array.from(extractPrimaryPartSections(cite))),
        ]);

        let overlaps = false;
        for (const n of targetNums) {
          const nPart = n.split(".")[0];
          if (sectionPart && nPart !== sectionPart) continue;
          if (primarySubjectNums.has(n)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) {
          matchedEntriesMap.set(entry.id, entry);
        }
      }
    }

    const matchedEntries = Array.from(matchedEntriesMap.values());
    const companionModules: CompanionCfrModule[] = matchedEntries.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      route: routeResolver(e),
    }));

    const primaryDiffEntry = matchedEntries.find((e) => e.category === "cfr-diff");
    let trapTables: CfrTrapTable[] = [];
    if (primaryDiffEntry) {
      const diffAbs = join(upstreamDir, primaryDiffEntry.path.replace(/\\/g, "/"));
      if (existsSync(diffAbs)) {
        trapTables = parseMarkdownTables(readFileSync(diffAbs, "utf8"), sectionSlug).slice(
          0,
          4,
        );
      }
    }

    const isPureQuarantine = enactedList.length === 0 && quarantinedRaw.length > 0;
    const isHeldAtGate =
      !isPureQuarantine &&
      heldAtGateCount > 0 &&
      companionModules.length === 0 &&
      enactedList.some(
        (v) => v.verbatim_text_status !== "summary-only-pull-print-cfr-before-cue",
      );

    const heldWaveId = isHeldAtGate ? inferHeldWaveForSection(sectionSlug) : null;

    const versions: CompiledCfrSnapshot[] = enactedList.map((v) => {
      const cleanedNotes = v.applicability_and_transition_notes
        ? sanitizeSchemaTokens(v.applicability_and_transition_notes)
        : undefined;

      const spec = VERSION_VERBATIM_SELECTORS[v.version_id];
      const specEntry = spec
        ? entryByPath.get(spec.authorityRelPath.replace(/\\/g, "/"))
        : undefined;
      const extracted =
        !isHeldAtGate &&
        spec &&
        v.verbatim_text_status !== "summary-only-pull-print-cfr-before-cue"
          ? extractVerbatimForSpec(spec, getParsedAuthorityBlocks)
          : {
              verbatimMarkdown: null,
              trailingNote: null,
              excerptScopeKey: null,
              excerptScopeLabel: null,
              scopedExcerpts: undefined,
            };

      const isSnapshotVerbatim = Boolean(extracted.verbatimMarkdown);
      const snapCoverage: CoverageState = isHeldAtGate
        ? "CORPUS_GAP_OR_QUEUED_WAVE"
        : isSnapshotVerbatim
          ? "VERBATIM_VERIFIED"
          : "SUMMARY_ONLY";
      const snapBookmark: CfrBookmarkStatus = isHeldAtGate
        ? "HELD_AT_BOOKMARK_GATE"
        : isSnapshotVerbatim
          ? "WAVE_1_LIVE_VERBATIM"
          : "SUMMARY_ONLY";

      const baseNote = extracted.trailingNote
        ? sanitizeSchemaTokens(extracted.trailingNote)
        : (cleanedNotes || null);
      const resolvedEraNote =
        isSnapshotVerbatim && extracted.excerptScopeLabel
          ? `Pinpoint Verbatim Excerpt (${extracted.excerptScopeLabel}): ${baseNote ?? ""}`.trim()
          : baseNote;

      return {
        ...v,
        applicability_and_transition_notes: cleanedNotes,
        coverageState: snapCoverage,
        bookmarkStatus: snapBookmark,
        heldWaveId,
        verbatimMarkdown: extracted.verbatimMarkdown,
        eraNote: resolvedEraNote,
        sourceModuleId: specEntry?.id ?? matchedEntries[0]?.id ?? null,
        excerptScopeKey: extracted.excerptScopeKey,
        excerptScopeLabel: extracted.excerptScopeLabel,
        scopedExcerpts: extracted.scopedExcerpts,
      };
    });

    const hasAnyVerbatimSnapshot = versions.some(
      (v) => v.coverageState === "VERBATIM_VERIFIED" && Boolean(v.verbatimMarkdown),
    );

    const primaryAuthEntry = matchedEntries.find((e) => e.category === "authority-snapshot");
    const veteranOverlay = primaryAuthEntry
      ? (overlays.get(primaryAuthEntry.id) ?? null)
      : matchedEntries[0]
        ? (overlays.get(matchedEntries[0].id) ?? null)
        : null;
    const diffVeteranOverlay = primaryDiffEntry
      ? (overlays.get(primaryDiffEntry.id) ?? null)
      : null;

    const bookmarkStatus: CfrBookmarkStatus = isPureQuarantine
      ? "QUARANTINED_NONBINDING"
      : isHeldAtGate
        ? "HELD_AT_BOOKMARK_GATE"
        : hasAnyVerbatimSnapshot
          ? "WAVE_1_LIVE_VERBATIM"
          : "SUMMARY_ONLY";

    const coverageState: CoverageState = isHeldAtGate
      ? "CORPUS_GAP_OR_QUEUED_WAVE"
      : hasAnyVerbatimSnapshot
        ? veteranOverlay || diffVeteranOverlay
          ? "VERBATIM_VERIFIED"
          : "PLAIN_ENGLISH_IN_PROGRESS"
        : "SUMMARY_ONLY";

    const quarantinedWatchlist: CompiledCfrSnapshot[] = quarantinedRaw.map((q) => {
      const cleanedNotes = q.applicability_and_transition_notes
        ? sanitizeSchemaTokens(q.applicability_and_transition_notes)
        : undefined;
      return {
        ...q,
        applicability_and_transition_notes: cleanedNotes,
        coverageState: "SUMMARY_ONLY",
        bookmarkStatus: "QUARANTINED_NONBINDING",
        heldWaveId: null,
        verbatimMarkdown: null,
        eraNote: cleanedNotes || null,
        sourceModuleId: matchedEntries[0]?.id ?? null,
      };
    });

    const leadRecord = enactedList[enactedList.length - 1] ?? rawList[0]!;
    const vasrdSystem = expectedVasrdSystem;

    const killSwitches = Array.from(
      new Set(matchedEntries.flatMap((e) => e.kill_switches ?? [])),
    )
      .map(sanitizeSchemaTokens)
      .slice(0, 6);
    const cFileTriggers = Array.from(
      new Set(matchedEntries.flatMap((e) => e.c_file_triggers ?? [])),
    )
      .map(sanitizeSchemaTokens)
      .slice(0, 6);
    const keyPrecedents = Array.from(
      new Set(matchedEntries.flatMap((e) => e.key_precedents ?? [])),
    ).slice(0, 10);
    const statutes = Array.from(
      new Set(matchedEntries.flatMap((e) => e.statutes ?? [])),
    ).slice(0, 6);
    const diagnosticCodes =
      expectedVasrdSystem !== null
        ? Array.from(
            new Set(matchedEntries.flatMap((e) => e.diagnostic_codes ?? [])),
          ).slice(0, 12)
        : [];

    const cleanedSummary = sanitizeSchemaTokens(
      leadRecord.applicability_and_transition_notes ??
        `Structured Federal Register transition history indexed across ${versions.length} snapshot(s).`,
    );

    sections.push({
      sectionSlug,
      cfrSection: leadRecord.cfr_section,
      title: leadRecord.heading ?? leadRecord.cfr_section,
      bookmarkStatus,
      heldWaveId,
      coverageState,
      vasrdSystem,
      summary: cleanedSummary,
      versions,
      quarantinedWatchlist,
      companionModules,
      killSwitches,
      cFileTriggers,
      keyPrecedents,
      statutes,
      diagnosticCodes,
      trapTables,
      veteranOverlay,
      diffVeteranOverlay,
      officialEcfrUrl: fallbackUrls.ecfrUrl,
      officialGovInfoUrl: fallbackUrls.govinfoUrl,
    });
  }

  // Attach successor regulatory links for genuinely repealed/consolidated historical provisions
  // without injecting cross-section apples-to-oranges text into CfrRedlineViewer.
  const SUCCESSOR_SECTIONS: Readonly<
    Record<string, { cfrSection: string; permalink: string; note: string }>
  > = {
    "38-cfr-4.16c": {
      cfrSection: "38 C.F.R. § 4.130 (Eff. 1996-11-07)",
      permalink: "/cfr/38-cfr-4.130/1996-11-07",
      note: "Repealed effective Nov. 7, 1996 (61 FR 52695) concurrently with the unified § 4.130 General Rating Formula for Mental Disorders.",
    },
    "38-cfr-4.132": {
      cfrSection: "38 C.F.R. § 4.130 (Eff. 1996-11-07)",
      permalink: "/cfr/38-cfr-4.130/1996-11-07",
      note: "Consolidated into 38 C.F.R. § 4.130 effective Nov. 7, 1996 (61 FR 52695).",
    },
    "38-cfr-3.157b": {
      cfrSection: "38 C.F.R. § 3.155 (Eff. 2015-03-24)",
      permalink: "/cfr/38-cfr-3.155/2015-03-24",
      note: "Prospectively repealed effective Mar. 24, 2015 (79 FR 57660) in favor of standardized claim forms and Intent to File under § 3.155.",
    },
  };

  for (const sec of sections) {
    const succ = SUCCESSOR_SECTIONS[sec.sectionSlug];
    if (succ) {
      sec.successorSection = succ;
    }
  }

  // Verify permalink uniqueness across all compiled CFR static routes (Crash Early)
  const seenPermalinks = new Set<string>();
  for (const sec of sections) {
    for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
      if (seenPermalinks.has(ver.permalink)) {
        throw new Error(
          `Duplicate CFR static permalink "${ver.permalink}" generated on ${ver.version_id}.`,
        );
      }
      seenPermalinks.add(ver.permalink);
    }
  }

  const wave1Order = new Map(
    WAVE_1_CFR_MAPPINGS.map((m, idx) => [m.sectionSlug, idx]),
  );
  return sections.sort((a, b) => {
    const aW1 = wave1Order.get(a.sectionSlug) ?? 999;
    const bW1 = wave1Order.get(b.sectionSlug) ?? 999;
    if (aW1 !== bW1) return aW1 - bW1;

    const aLive = a.bookmarkStatus === "WAVE_1_LIVE_VERBATIM" ? 0 : 1;
    const bLive = b.bookmarkStatus === "WAVE_1_LIVE_VERBATIM" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;

    const aMulti =
      a.versions.filter((v) => Boolean(v.verbatimMarkdown)).length +
        (a.relatedComparisonSnapshots?.length ?? 0) >=
      2
        ? 0
        : 1;
    const bMulti =
      b.versions.filter((v) => Boolean(v.verbatimMarkdown)).length +
        (b.relatedComparisonSnapshots?.length ?? 0) >=
      2
        ? 0
        : 1;
    if (aMulti !== bMulti) return aMulti - bMulti;

    return a.sectionSlug.localeCompare(b.sectionSlug);
  });
}
