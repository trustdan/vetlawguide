export type CoverageState =
  | "VERBATIM_VERIFIED"
  | "SUMMARY_ONLY"
  | "PLAIN_ENGLISH_IN_PROGRESS"
  | "CORPUS_GAP_OR_QUEUED_WAVE";

export type AudienceMode = "veteran" | "practitioner";

export interface SearchableItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group:
    | "Verbatim 38 C.F.R. & VASRD Hubs"
    | "Playbooks, Treatises & Checklists"
    | "Lexicon, Crosswalk & Era Lenses";
  keywords: string;
  diagnosticCodes?: string[];
  cfrCitations?: string[];
  statutes?: string[];
  formKeys?: string[];
}

export interface ExplainableSearchMatch {
  item: SearchableItem;
  score: number;
  matchKind:
    | "deterministic-dc"
    | "deterministic-cfr"
    | "deterministic-statute"
    | "deterministic-form"
    | "keyword";
  matchReason: string;
}

export type MarkdownBlock =
  | {
      kind: "heading";
      level: 2 | 3;
      id: string;
      text: string;
    }
  | {
      kind: "alert";
      alertType: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";
      lines: string[];
    }
  | {
      kind: "blockquote";
      lines: string[];
    }
  | {
      kind: "code";
      language: string;
      code: string;
    }
  | {
      kind: "table";
      headers: string[];
      rows: string[][];
    }
  | {
      kind: "checklist";
      items: string[];
    }
  | {
      kind: "list";
      ordered: boolean;
      items: string[];
    }
  | {
      kind: "paragraph";
      text: string;
    };

export interface CompiledDocument {
  id: string;
  slug: string;
  route: string;
  title: string;
  category: DocumentCategory;
  status: "LIVE_VERIFIED" | "WAVE_1_LIVE" | "HELD_AT_GATE";
  waveId: string;
  coverageState: CoverageState;
  bitemporalScope?: BitemporalScope | null;
  practiceDomains?: string[];
  vasrdSystem?: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  statutes: string[];
  cfrCitations: string[];
  diagnosticCodes: string[];
  keyPrecedents: string[];
  cFileTriggers: string[];
  killSwitches: string[];
  unfinalizedProposals: string[];
  toc: Array<{ id: string; level: 2 | 3; text: string }>;
  blocks: MarkdownBlock[];
  veteranOverlay: VeteranOverlay | null;
  officialFallbackUrl: string;
}

export type DocumentCategory =
  | "doctrine"
  | "era-lens"
  | "playbook"
  | "cfr-diff"
  | "checklist"
  | "authority-snapshot";

export type BitemporalScope =
  | "cue-and-open-claim"
  | "open-claim-only-george-restricted"
  | "prospective-liberalizing-3.114"
  | "mixed-see-text";

export type RegulatoryStatus =
  | "proposed-nonbinding"
  | "interim-final-rescinded"
  | "final-effective"
  | "repealed-historical";

export type VerbatimTextStatus =
  | "verbatim-govinfo-ecfr"
  | "verbatim-federal-register"
  | "summary-only-pull-print-cfr-before-cue";

export interface ManifestLock {
  schemaVersion: "1.0.0";
  upstreamRepo: string;
  upstreamCommitSha: string;
  upstreamBranch: string;
  syncedAt: string;
  checkedAsOf: string;
  corpusReleaseId: string;
  fileCount: number;
  files: Record<string, string>;
}

export interface UpstreamIndexEntry {
  id: string;
  title: string;
  category: DocumentCategory;
  path: string;
  effective_from: string;
  effective_to: string | null;
  bitemporal_scope?: BitemporalScope;
  practice_domains?: string[];
  vasrd_system?: string | null;
  statutes: string[];
  cfr_citations: string[];
  diagnostic_codes?: string[];
  key_precedents: string[];
  retro_pathways: string[];
  c_file_triggers?: string[];
  kill_switches?: string[];
  unfinalized_proposals?: string[];
  verification_status: string;
}

export interface CfrVersionRecord {
  version_id: string;
  cfr_section: string;
  heading?: string;
  regulatory_status: RegulatoryStatus;
  federal_register_citation?: string | null;
  publication_date?: string | null;
  effective_from: string;
  effective_to?: string | null;
  supersedes?: string | null;
  superseded_by?: string | null;
  applicability_and_transition_notes?: string;
  verbatim_text_status: VerbatimTextStatus;
}

export interface CompiledCfrVersion extends CfrVersionRecord {
  sectionSlug: string;
  permalink: string;
  coverageState: CoverageState;
}

export interface ResolvedCfrQuery {
  sectionSlug: string;
  decisionDate: string;
  coverageState: CoverageState;
  doNotRely: boolean;
  governingVersion: CompiledCfrVersion | null;
  quarantinedWatchlist: CompiledCfrVersion[];
  explanation: string;
  officialFallbackUrls: {
    ecfrUrl: string;
    govinfoUrl: string;
  };
}

export type RedlineSegmentKind = "equal" | "removed" | "added";

export interface RedlineSegment {
  kind: RedlineSegmentKind;
  text: string;
}

export interface AlignedRedlineRow {
  rowIndex: number;
  changeKind: "unchanged" | "modified" | "added" | "removed";
  beforeParagraph: string | null;
  afterParagraph: string | null;
  inlineSegments: RedlineSegment[];
}

export interface RedlineComparisonResult {
  beforeLabel: string;
  afterLabel: string;
  inlineSegments: RedlineSegment[];
  alignedRows: AlignedRedlineRow[];
  stats: {
    addedTokens: number;
    removedTokens: number;
    unchangedTokens: number;
    changedParagraphs: number;
  };
}

export type CfrBookmarkStatus =
  | "WAVE_1_LIVE_VERBATIM"
  | "HELD_AT_BOOKMARK_GATE"
  | "SUMMARY_ONLY"
  | "QUARANTINED_NONBINDING";

export interface CompiledCfrSnapshot extends CompiledCfrVersion {
  bookmarkStatus: CfrBookmarkStatus;
  heldWaveId: string | null;
  verbatimMarkdown: string | null;
  eraNote: string | null;
  sourceModuleId: string | null;
  excerptScopeKey?: string | null;
  excerptScopeLabel?: string | null;
  scopedExcerpts?: Record<string, string>;
}

export interface CfrTrapTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface CompanionCfrModule {
  id: string;
  title: string;
  category: DocumentCategory;
  route: string;
}

export interface CompiledCfrSection {
  sectionSlug: string;
  cfrSection: string;
  title: string;
  bookmarkStatus: CfrBookmarkStatus;
  heldWaveId: string | null;
  coverageState: CoverageState;
  vasrdSystem?: string | null;
  summary: string;
  versions: CompiledCfrSnapshot[];
  quarantinedWatchlist: CompiledCfrSnapshot[];
  relatedComparisonSnapshots?: CompiledCfrSnapshot[];
  successorSection?: {
    cfrSection: string;
    permalink: string;
    note?: string;
  } | null;
  companionModules?: CompanionCfrModule[];
  killSwitches: string[];
  cFileTriggers: string[];
  keyPrecedents: string[];
  statutes: string[];
  diagnosticCodes: string[];
  trapTables: CfrTrapTable[];
  veteranOverlay: VeteranOverlay | null;
  diffVeteranOverlay: VeteranOverlay | null;
  officialEcfrUrl: string;
  officialGovInfoUrl: string;
}

export interface BitemporalTwoPaneContext {
  decisionDate: string;
  statutoryEraLabel: string;
  statutoryEraDetail: string;
  recordScopeRuleThen: string;
  informalClaimRuleThen: string;
  publicationGapTrapAlert: string | null;
  vehiclesToday: ReadonlyArray<{
    id: string;
    title: string;
    citation: string;
    summary: string;
  }>;
  collateralLimitsToday: ReadonlyArray<{
    id: string;
    title: string;
    citation: string;
    scopeRule: string;
  }>;
}

export interface StatutoryCrosswalkEntry {
  eraAAuthority: string;
  eraBSection: string;
  eraCSection: string;
  subject: string;
  notes: string;
}

export interface LexiconEntry {
  key: string;
  kind: "acronym" | "form" | "codesheet";
  label: string;
  plainEnglish: string;
  practitionerNote: string;
}

export type HistoricalEraId =
  | "era-1945-1961"
  | "era-1962-1988"
  | "era-1988-2000"
  | "era-2000-2018"
  | "era-2019-present";

export type AuthorityTier =
  | "scotus"
  | "fed-cir"
  | "cavc-precedential"
  | "vaopgcprec-binding"
  | "vaopgcprec-quarantined"
  | "cavc-nonprecedential-rule30a"
  | "fed-cir-nonprecedential"
  | "district-or-other";

export type AuthorityValidityStatus =
  | "active-precedent"
  | "active-modified"
  | "invalidated-or-superseded"
  | "withdrawn"
  | "nonprecedential";

export interface PrecedentCitedModule {
  id: string;
  title: string;
  route: string;
}

export interface PrecedentEraCaution {
  eraId: HistoricalEraId;
  caution: string;
}

export interface PrecedentEntry {
  citation: string;
  slug: string;
  shortTitle?: string;
  authorityTier?: AuthorityTier;
  validityStatus?: AuthorityValidityStatus;
  validityLabel?: string;
  issuanceYear?: number | null;
  issuanceDateLabel?: string | null;
  federalRegisterCitation?: string | null;
  issuanceEraId?: HistoricalEraId | null;
  eraGovernanceScope?: "era-specific" | "cross-era";
  applicableDecisionEras?: HistoricalEraId[];
  eraLensHighlights?: HistoricalEraId[];
  eraCutoffCautions?: PrecedentEraCaution[];
  practiceDomains?: string[];
  coreHolding?: string | null;
  litigationUtility?: string | null;
  veteranPlainSummary?: string | null;
  isCuratedLandmark?: boolean;
  isNonprecedentialRule30a: boolean;
  isNonprecedentialFedCir?: boolean;
  isVaopgcprec: boolean;
  citedByModuleIds: string[];
  citedByModules?: PrecedentCitedModule[];
  checkedAsOf: string;
}

export interface VeteranOverlay {
  upstream_id: string;
  upstream_path: string;
  upstream_sha256: string;
  linked_version_ids: string[];
  reviewed_at: string;
  plain_english_title: string;
  what_this_means: string;
  record_clues: string[];
  important_cautions: string[];
  questions_for_representative: string[];
}

export interface VasrdSystemCoverage {
  systemId: string;
  label: string;
  diagnosticCodeRange: string;
  coverageState: CoverageState;
  moduleIds: string[];
  plainEnglishCount: number;
  upstreamPlannedWave: string | null;
  officialEcfrUrl: string;
}

export interface PracticeDomainCoverage {
  domainId: string;
  label: string;
  coverageState: CoverageState;
  moduleIds: string[];
  plainEnglishCount: number;
  upstreamPlannedEpic: string | null;
}

export interface CompiledModuleSummary {
  id: string;
  title: string;
  category: DocumentCategory;
  upstreamPath: string;
  canonicalRoute: string;
  coverageState: CoverageState;
  hasVeteranOverlay: boolean;
  bitemporalScope: BitemporalScope | null;
  practiceDomains: string[];
  vasrdSystem: string | null;
  diagnosticCodes: string[];
  cfrCitations: string[];
  statutes: string[];
  unfinalizedProposals: string[];
}

export interface CoverageManifest {
  corpusReleaseId: string;
  activeBookmarkWave: string;
  upstreamCommitSha: string;
  checkedAsOf: string;
  generatedAt: string;
  totals: {
    upstreamModules: number;
    heldAtGateModules: number;
    cfrVersionRecords: number;
    cfrSectionsIndexed: number;
    veteranOverlaysAuthored: number;
    lexiconEntries: number;
    statutoryCrosswalkEntries: number;
    precedentsIndexed: number;
    resolvedMarkdownLinks: number;
  };
  vasrdSystems: VasrdSystemCoverage[];
  practiceDomains: PracticeDomainCoverage[];
  modules: CompiledModuleSummary[];
  heldAtGatePlaceholders: Array<{
    id: string;
    title: string;
    category: DocumentCategory;
    upstreamPath: string;
    canonicalRoute: string;
    waveId: string;
  }>;
}

export const CANONICAL_VASRD_SYSTEMS: ReadonlyArray<{
  systemId: string;
  label: string;
  diagnosticCodeRange: string;
  upstreamPlannedWave: string | null;
  officialEcfrUrl: string;
}> = [
  {
    systemId: "part-4-general-policy",
    label: "Part 4 Subpart A — General Rating Policy (§§ 4.1–4.31)",
    diagnosticCodeRange: "§§ 4.1–4.31",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-A",
  },
  {
    systemId: "01-musculoskeletal",
    label: "01. Musculoskeletal System (Joints, Spine & Muscle Groups)",
    diagnosticCodeRange: "DC 5000–5331",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRd3005f7d828ea7b",
  },
  {
    systemId: "02-eye-vision",
    label: "02. Organs of Special Sense — Eye & Vision",
    diagnosticCodeRange: "DC 6000–6091",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR2dd591a51640425",
  },
  {
    systemId: "03-auditory",
    label: "03. Impairment of Auditory Acuity & Tinnitus",
    diagnosticCodeRange: "DC 6100–6260",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR3fb8261be1e899f",
  },
  {
    systemId: "04-infectious-immune",
    label: "04. Infectious Diseases, Immune Disorders & Nutritional Deficiencies",
    diagnosticCodeRange: "DC 6300–6354",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRc88f57fafb24f86",
  },
  {
    systemId: "05-respiratory",
    label: "05. Respiratory System",
    diagnosticCodeRange: "DC 6502–6847",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR14fb86bcc86c2cb",
  },
  {
    systemId: "06-cardiovascular",
    label: "06. Cardiovascular System",
    diagnosticCodeRange: "DC 7000–7124",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRc80f576885c6b42",
  },
  {
    systemId: "07-digestive",
    label: "07. Digestive System",
    diagnosticCodeRange: "DC 7200–7357",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRae933be23f9c63f",
  },
  {
    systemId: "08-genitourinary",
    label: "08. Genitourinary System",
    diagnosticCodeRange: "DC 7500–7545",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR8198d98a7a48906",
  },
  {
    systemId: "09-gynecological-breast",
    label: "09. Gynecological Conditions & Disorders of the Breast",
    diagnosticCodeRange: "DC 7610–7632",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRf5fe31f49d4f511",
  },
  {
    systemId: "10-hemic-lymphatic",
    label: "10. Hemic & Lymphatic Systems",
    diagnosticCodeRange: "DC 7702–7725",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR6f0b30fb421b9d7",
  },
  {
    systemId: "11-skin",
    label: "11. The Skin & Scars (DC 7800–7833)",
    diagnosticCodeRange: "DC 7800–7833",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRf6c763e9e4b1967",
  },
  {
    systemId: "12-endocrine",
    label: "12. Endocrine System",
    diagnosticCodeRange: "DC 7900–7919",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR2c78858c0e52f1b",
  },
  {
    systemId: "13-neurological",
    label: "13. Neurological Conditions, TBI & Peripheral Nerves",
    diagnosticCodeRange: "DC 8000–8914",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRab3ca55f4548afe",
  },
  {
    systemId: "14-mental-disorders",
    label: "14. Mental Disorders",
    diagnosticCodeRange: "DC 9201–9521",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFRfa64377db09ae97",
  },
  {
    systemId: "15-dental-oral",
    label: "15. Dental & Oral Conditions",
    diagnosticCodeRange: "DC 9900–9918",
    upstreamPlannedWave: null,
    officialEcfrUrl: "https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-B/subject-group-ECFR2420d6b1fb63bc2",
  },
];

export const CANONICAL_PRACTICE_DOMAINS: ReadonlyArray<{
  domainId: string;
  label: string;
  upstreamPlannedEpic: string | null;
}> = [
  { domainId: "finality-and-cue", label: "Piercing Finality, Pending Claims & CUE", upstreamPlannedEpic: null },
  { domainId: "disability-compensation", label: "Service Connection & Secondary Aggravation", upstreamPlannedEpic: null },
  { domainId: "character-of-discharge", label: "Character of Discharge, Insanity & Guard/Reserve", upstreamPlannedEpic: null },
  { domainId: "toxic-exposure", label: "Agent Orange / Nehmer, Burn Pits, PACT & TERA", upstreamPlannedEpic: null },
  { domainId: "vasrd-rating-schedule", label: "VASRD Rating Criteria & Anti-Pyramiding", upstreamPlannedEpic: null },
  { domainId: "tdiu-unemployability", label: "TDIU & Extraschedular Unemployability", upstreamPlannedEpic: null },
  { domainId: "smc-ancillary", label: "Special Monthly Compensation (SMC k–t) & Ancillaries", upstreamPlannedEpic: null },
  { domainId: "survivors-dic-accrued", label: "Survivor DIC (§ 1310 / § 1318), Accrued & Substitution", upstreamPlannedEpic: null },
  { domainId: "effective-dates-offsets", label: "Effective Dates, CRDP/CRSC & Severance Offsets", upstreamPlannedEpic: null },
  { domainId: "pension-fiduciary-debt", label: "Wartime Pension, Overpayment Waivers & Competency", upstreamPlannedEpic: null },
  { domainId: "appeals-cavc-litigation", label: "AMA Lanes, Board Litigation & CAVC / Fed. Cir. Appeals", upstreamPlannedEpic: null },
  { domainId: "vre-medical-reimbursement", label: "Ch. 31 VR&E & §§ 1725/1728 Emergency Medical Reimbursement", upstreamPlannedEpic: null },
  { domainId: "fees-eaja", label: "§ 5904 Representation Fees & EAJA Litigation", upstreamPlannedEpic: null },
];

export function getVasrdSystemLabel(
  systemId: string | null | undefined,
): string | null {
  if (!systemId) return null;
  return (
    CANONICAL_VASRD_SYSTEMS.find((s) => s.systemId === systemId)?.label ??
    systemId
  );
}

export function classifyPrecedentNonprecedential(citation: string): {
  isRule30a: boolean;
  isFedCirNonprecedential: boolean;
} {
  const isFedCir = /\bFed\.\s*Cir\./i.test(citation);
  if (isFedCir) {
    return {
      isRule30a: false,
      isFedCirNonprecedential:
        /\bnonprecedential\b|\bF\.\s*App['’]x\b/i.test(citation),
    };
  }
  return {
    isRule30a: /\bmem\.\s*dec\.|\bnonprecedential\b|\brule\s*30\(a\)/i.test(
      citation,
    ),
    isFedCirNonprecedential: false,
  };
}
