import type { BitemporalTwoPaneContext, CoverageState } from "@/lib/corpus/types";

export type TriValue = "yes" | "no" | "unknown";

export type PathwayDisposition =
  | "supported-to-investigate"
  | "unresolved-records-needed"
  | "barred-or-inapplicable";

export type DecisionAgency = "AOJ-RO" | "BVA" | "unknown";

export type IssueFocus =
  | "penetrating-scar-muscle"
  | "service-records-reconsideration"
  | "finality-nod-informal-notice"
  | "general-collateral-review";

export type RetireeProfile = "none" | "military-retiree-or-ch61" | "unknown";

export type FactQuestionGroup =
  | "service-records"
  | "pending-finality"
  | "scar-vs-muscle"
  | "cue-record-and-math";

export interface MissingRecordDefinition {
  recordId: string;
  documentName: string;
  whyItMatters: string;
  howToRequest: string;
  practitionerAuditNote: string;
  priorityOrder: number;
}

export interface MissingRecordChecklistItem extends MissingRecordDefinition {
  triggeredByFactIds: string[];
  unlocksPathwayTitles: string[];
  unlocksPathwayTitlesVeteran: string[];
}

export interface ScreeningFactQuestion {
  factId: string;
  group: FactQuestionGroup;
  veteranQuestion: string;
  veteranHelp: string;
  practitionerQuestion: string;
  practitionerAuthorityNote: string;
  missingRecord: MissingRecordDefinition;
}

export interface InvestigationIntakeState {
  decisionDate: string;
  decisionAgency: DecisionAgency;
  issueFocus: IssueFocus;
  bvaMeritsSubsumed: TriValue;
  priorBvaCueDecidedOnMerits: TriValue;
  retireeStatus: RetireeProfile;
  answers: Record<string, TriValue>;
}

export interface InvestigationScenarioPreset {
  presetId: string;
  veteranLabel: string;
  practitionerLabel: string;
  shortDescription: string;
  state: InvestigationIntakeState;
}

export interface PointInTimeAuthorityLink {
  sectionSlug: string;
  cfrSection: string;
  coverageState: CoverageState;
  doNotRely: boolean;
  permalink: string | null;
  effectiveIntervalLabel: string;
  publicationDateLabel: string;
  publicationGapTrapAlert: string | null;
  quarantinedProposalsNote: string | null;
  explanation: string;
  officialEcfrUrl: string;
  officialGovinfoUrl: string;
}

export interface EvaluatedInvestigationPathway {
  pathwayId: string;
  rankOrder: number;
  priorityBadgeVeteran: string;
  priorityBadgePractitioner: string;
  veteranTitle: string;
  practitionerTitle: string;
  veteranSummary: string;
  practitionerSummary: string;
  disposition: PathwayDisposition;
  dispositionLabelVeteran: string;
  dispositionLabelPractitioner: string;
  doctrinalScopeBadgeVeteran: string;
  doctrinalScopeBadge: string;
  triggeredByAnswersVeteran: string[];
  triggeredByAnswers: string[];
  blockingReasonsVeteran: string[];
  blockingReasons: string[];
  recordsToLocate: MissingRecordDefinition[];
  authorityCitations: string[];
  bitemporalNoteVeteran: string;
  bitemporalNotePractitioner: string;
  pointInTimeLinks: PointInTimeAuthorityLink[];
  relatedSiteRoutes: Array<{ label: string; href: string }>;
  killSwitchesVeteran: string[];
  killSwitchesToVerify: string[];
  veteranDiscussionQuestions: string[];
}

export interface PractitionerVerificationGate {
  gateId: string;
  title: string;
  detail: string;
  status: "verified" | "action-required" | "barred";
}

export interface CrossSystemRetireeAdvisory {
  applicable: boolean;
  status: "candidate" | "verify-retiree-status" | "not-applicable";
  veteranNote: string;
  practitionerNote: string;
}

export interface InvestigationEvaluationReport {
  intake: InvestigationIntakeState;
  twoPaneContext: BitemporalTwoPaneContext;
  pathways: EvaluatedInvestigationPathway[];
  prioritizedRecordsToLocate: MissingRecordChecklistItem[];
  veteranDiscussionChecklist: string[];
  practitionerVerificationGates: PractitionerVerificationGate[];
  retireeCrscAdvisory: CrossSystemRetireeAdvisory;
}

export interface CorpusStampMetadata {
  corpusReleaseId: string;
  checkedAsOf: string;
  upstreamCommitShort: string;
}
