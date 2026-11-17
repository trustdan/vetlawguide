import type {
  CorpusStampMetadata,
  DecisionAgency,
  InvestigationEvaluationReport,
  IssueFocus,
  PractitionerVerificationGate,
  TriValue,
} from "./types";
import { SCREENING_QUESTIONS } from "./engine";

function formatAgencyHuman(agency: DecisionAgency): string {
  switch (agency) {
    case "AOJ-RO":
      return "VA Regional Office (Agency of Original Jurisdiction Rating Decision)";
    case "BVA":
      return "Board of Veterans' Appeals (BVA Decision)";
    case "unknown":
      return "Not Yet Confirmed (Verify in C-File)";
  }
}

function formatFocusHuman(focus: IssueFocus): string {
  switch (focus) {
    case "penetrating-scar-muscle":
      return "Gunshot, Shrapnel & Penetrating Wounds (Skin Scar DC 7800–7805 vs. Muscle DC 5301–5323)";
    case "service-records-reconsideration":
      return "Missing Military or Inpatient Surgical Records (38 C.F.R. § 3.156(c))";
    case "finality-nod-informal-notice":
      return "Unfinished Appeal / Unissued Statement of the Case / Pre-2015 Informal Claim / Defective Notice";
    case "stabilized-reduction-or-severance":
      return "Lowered or Severed Existing Rating (38 C.F.R. §§ 3.105(e), 3.344, 3.951, 3.957)";
    case "tdiu-or-smc":
      return "Unemployability (TDIU, 38 C.F.R. § 4.16) & Special Monthly Compensation (SMC k–t)";
    case "nehmer-herbicide":
      return "Agent Orange / Herbicide Presumptions & Nehmer Retroactive Awards (38 C.F.R. § 3.816)";
    case "survivor-dic-accrued":
      return "Survivor DIC (§ 1310 / § 1318 / PACT § 3.33), Pending-Claim Substitution (§ 5121A) & Accrued Back Pay";
    case "cod-or-insanity":
      return "Character of Discharge (2024 38 C.F.R. § 3.12), Prior Enlistments (§ 3.13) & Insanity (§ 3.354(b))";
    case "severance-recoupment":
      return "Military Disability Severance / Separation Pay Recoupment Audit (10 U.S.C. § 1212(d)(2); 38 C.F.R. § 3.700(a)(3))";
    case "general-collateral-review":
      return "General Historical Rating or Board Decision Audit";
  }
}

function formatTriValueVeteran(v: TriValue): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "I'm Not Sure (Check Records)";
}

function formatTriValuePractitioner(v: TriValue): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "Unknown (Pending Record Verification)";
}

function formatGateStatusHuman(status: PractitionerVerificationGate["status"]): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "barred":
      return "Bar Alert";
    case "action-required":
      return "Verify Before Filing";
  }
}

export function buildVeteranDiscussionPacketMarkdown(
  report: InvestigationEvaluationReport,
  stamp: CorpusStampMetadata,
): string {
  const lines: string[] = [];

  lines.push(
    "# Representative Discussion & Records Sheet (VetLawGuide)",
    "",
    "> **Educational Reference Only — Not Legal Advice:** Nothing in this sheet constitutes legal or medical advice or creates an attorney-client relationship. Share this educational summary with a VA-accredited Veterans Service Organization (VSO) representative, claims agent, or attorney—and **never paste your Social Security Number or VA file number into public websites or unsecured emails.**",
    "",
    `- **Target VA Decision Date Reviewed:** \`${report.intake.decisionDate}\``,
    `- **Decision Office:** ${formatAgencyHuman(report.intake.decisionAgency)}`,
    `- **Topic Area:** ${formatFocusHuman(report.intake.issueFocus)}`,
    `- **Corpus Provenance Stamp:** \`${stamp.corpusReleaseId}\` (Checked as of \`${stamp.checkedAsOf}\`, snapshot \`${stamp.upstreamCommitShort}\`)`,
    "",
    "---",
    "",
    "## 1. Priority Records to Request & Locate",
    "",
  );

  if (report.prioritizedRecordsToLocate.length === 0) {
    lines.push(
      "- All core screening questions were answered `Yes` or `No`. Bring copies of your prior VA Rating Decisions, Rating Code Sheets, DD-214, and relevant medical records to your accredited representative.",
      "",
    );
  } else {
    for (const rec of report.prioritizedRecordsToLocate) {
      lines.push(
        `### [ ] ${rec.documentName}`,
        `- **Why It Matters:** ${rec.whyItMatters}`,
        `- **How to Request:** ${rec.howToRequest}`,
        `- **Helps Clarify:** ${rec.unlocksPathwayTitlesVeteran.join(" · ")}`,
        "",
      );
    }
  }

  lines.push(
    "---",
    "",
    "## 2. Questions to Discuss With an Accredited VSO, Claims Agent, or Attorney",
    "",
  );

  for (const q of report.veteranDiscussionChecklist) {
    lines.push(`- [ ] ${q}`);
  }

  if (report.retireeCrscAdvisory.applicable) {
    lines.push(
      `- [ ] **Military Retiree DoD / DFAS Check:** ${report.retireeCrscAdvisory.veteranNote}`,
    );
  }

  lines.push(
    "",
    "---",
    "",
    "## 3. Candidate Legal Options Kept Open for Representative Review",
    "",
  );

  for (const p of report.pathways) {
    lines.push(
      `### ${p.rankOrder}. ${p.veteranTitle}`,
      `- **Current Screening Status:** ${p.dispositionLabelVeteran}`,
      `- **Key Rule Principle:** ${p.doctrinalScopeBadgeVeteran}`,
      `- **Plain-English Summary:** ${p.veteranSummary}`,
      `- **Date-Specific Rule Note (${report.intake.decisionDate}):** ${p.bitemporalNoteVeteran}`,
    );
    if (p.pointInTimeLinks.length > 0) {
      for (const link of p.pointInTimeLinks) {
        const coverageTag = link.doNotRely
          ? " [DO NOT RELY — Date Precedes Indexed Snapshot; Check Official Print CFR]"
          : link.coverageState === "SUMMARY_ONLY"
            ? " [SUMMARY ONLY — Ask Representative to Check Official Print 38 C.F.R. Before Filing CUE]"
            : "";
        lines.push(
          `- **Point-in-Time Regulation Reference:** ${link.cfrSection} (${link.permalink ?? link.effectiveIntervalLabel})${coverageTag}`,
        );
      }
    }
    if (p.blockingReasonsVeteran.length > 0) {
      lines.push(
        `- **Why Not Currently Matched:** ${p.blockingReasonsVeteran.join(" ")}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## 4. Answers You Entered in This On-Device Session",
    "",
    `- **Did BVA later decide this issue on the merits?** ${formatTriValueVeteran(report.intake.bvaMeritsSubsumed)}`,
    `- **Was a prior Board CUE motion already decided on the merits on this issue?** ${formatTriValueVeteran(report.intake.priorBvaCueDecidedOnMerits)}`,
  );

  for (const q of SCREENING_QUESTIONS) {
    const val = report.intake.answers[q.factId] ?? "unknown";
    lines.push(`- **${q.veteranQuestion}** — *${formatTriValueVeteran(val)}*`);
  }

  lines.push(
    "",
    "---",
    "",
    "**Important Procedural Deadlines & Cautions:**",
    "- If challenging a recent Board of Veterans' Appeals decision, strict **120-day** Court of Appeals for Veterans Claims (`38 U.S.C. § 7266(a)`) and **1-year** AMA supplemental-claim deadlines apply.",
    "- Under `38 C.F.R. § 20.1409(c)`, VA allows **only one final merits CUE decision per prior Board decision on an issue** (excluding without-prejudice pleading dismissals under `§ 20.1404`). Always verify non-CUE alternatives (`§ 3.156(c)`) and review the complete C-file with an accredited representative first.",
    "",
  );

  return lines.join("\n");
}

export function buildPractitionerAuditPacketMarkdown(
  report: InvestigationEvaluationReport,
  stamp: CorpusStampMetadata,
): string {
  const lines: string[] = [];

  lines.push(
    "# Pre-Filing C-File Audit & Bitemporal Gate Packet (VetLawGuide)",
    "",
    "> **Educational & Research Reference Only — Zero-PII Reminder:** Generated strictly in local browser memory with zero network transmission. Verify every primary source citation, print `38 C.F.R.` edition, and C-file document date independently prior to filing—and **never paste unredacted client Social Security Numbers or VA file numbers into unsecured channels.**",
    "",
    "## 1. Case-Screen Hypothesis & Corpus Provenance Stamp",
    "",
    `- **Challenged Decision Date (T₀):** \`${report.intake.decisionDate}\``,
    `- **Adjudicating Agency:** ${formatAgencyHuman(report.intake.decisionAgency)}`,
    `- **Primary Issue Focus:** ${formatFocusHuman(report.intake.issueFocus)}`,
    `- **BVA Merits Subsumption (§ 20.1104):** ${formatTriValuePractitioner(report.intake.bvaMeritsSubsumed)}`,
    `- **Prior Subpart O Merits Decision (§ 20.1409(c)):** ${formatTriValuePractitioner(report.intake.priorBvaCueDecidedOnMerits)}`,
    `- **Corpus Release Stamp:** \`${stamp.corpusReleaseId}\` · Checked as of \`${stamp.checkedAsOf}\` · Lock \`${stamp.upstreamCommitShort}\``,
    "",
    "---",
    "",
    "## 2. Two-Pane Bitemporal Baseline (`T₀` Law Then vs. Analysis Today)",
    "",
    `- **Statutory Numbering Era on \`${report.intake.decisionDate}\`:** ${report.twoPaneContext.statutoryEraLabel}`,
    `  - ${report.twoPaneContext.statutoryEraDetail}`,
    `- **Record-Scope Rule on \`${report.intake.decisionDate}\`:** ${report.twoPaneContext.recordScopeRuleThen}`,
    `- **Informal-Claim / Hospital-Report Rule on \`${report.intake.decisionDate}\`:** ${report.twoPaneContext.informalClaimRuleThen}`,
  );

  if (report.twoPaneContext.publicationGapTrapAlert) {
    lines.push(
      `- **FEDERAL REGISTER PUB-VS-EFFECTIVE TRAP ALERT:** ${report.twoPaneContext.publicationGapTrapAlert}`,
    );
  }

  lines.push(
    "",
    "---",
    "",
    "## 3. Ranked Candidate Vehicles, Triggers & Kill Switches",
    "",
  );

  for (const p of report.pathways) {
    lines.push(
      `### Rank ${p.rankOrder}: ${p.practitionerTitle}`,
      `- **Disposition:** ${p.dispositionLabelPractitioner}`,
      `- **Doctrinal Scope:** ${p.doctrinalScopeBadge}`,
      `- **Controlling Authorities:** ${p.authorityCitations.join("; ")}`,
      `- **Bitemporal Audit Note:** ${p.bitemporalNotePractitioner}`,
    );

    if (p.pointInTimeLinks.length > 0) {
      lines.push("- **Point-in-Time `38 C.F.R.` Permalinks (`T₀`):**");
      for (const link of p.pointInTimeLinks) {
        const summaryWarning =
          !link.doNotRely && link.coverageState === "SUMMARY_ONLY"
            ? " — [SUMMARY ONLY: Pull Official Print 38 C.F.R. Edition Before Pleading CUE]"
            : "";
        lines.push(
          `  - \`${link.cfrSection}\`: ${link.permalink ?? "DO NOT RELY (Pre-Baseline / Unindexed)"} (${link.effectiveIntervalLabel}; ${link.publicationDateLabel})${summaryWarning}`,
        );
        if (link.quarantinedProposalsNote) {
          lines.push(`    - *Quarantine Guard:* ${link.quarantinedProposalsNote}`);
        }
      }
    }

    if (p.triggeredByAnswers.length > 0) {
      lines.push("- **Why Triggered:**");
      for (const trig of p.triggeredByAnswers) {
        lines.push(`  - ${trig}`);
      }
    }

    if (p.blockingReasons.length > 0) {
      lines.push("- **Disqualifiers / Jurisdictional Bars:**");
      for (const blk of p.blockingReasons) {
        lines.push(`  - ${blk}`);
      }
    }

    if (p.recordsToLocate.length > 0) {
      lines.push("- **Unresolved Preconditions (Records Required):**");
      for (const rec of p.recordsToLocate) {
        lines.push(`  - ${rec.documentName} — ${rec.practitionerAuditNote}`);
      }
    }

    lines.push("- **Kill Switches to Verify Before Pleading:**");
    for (const ks of p.killSwitchesToVerify) {
      lines.push(`  - [ ] ${ks}`);
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## 4. Deduplicated Evidentiary Production & C-File Audit Queue",
    "",
  );

  if (report.prioritizedRecordsToLocate.length === 0) {
    lines.push("- [x] All screening preconditions marked resolved (`Yes` / `No`).", "");
  } else {
    for (const rec of report.prioritizedRecordsToLocate) {
      lines.push(
        `- [ ] **${rec.documentName}**`,
        `  - *Audit Action:* ${rec.practitionerAuditNote}`,
        `  - *Unlocks Pathways:* ${rec.unlocksPathwayTitles.join(" · ")}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## 5. Mandatory Pre-Filing Verification Gates",
    "",
  );

  for (const gate of report.practitionerVerificationGates) {
    const marker = gate.status === "verified" ? "[x]" : "[ ]";
    lines.push(
      `- ${marker} **${gate.title}** [${formatGateStatusHuman(gate.status)}]`,
      `  - ${gate.detail}`,
    );
  }

  lines.push(
    "",
    "### Cross-System Title 10 DoD / DFAS Check",
    `- ${report.retireeCrscAdvisory.practitionerNote}`,
    "",
  );

  return lines.join("\n");
}
