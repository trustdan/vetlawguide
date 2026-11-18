import {
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";
import { SITE_URL } from "./metadata";

/**
 * Generates `/llms.txt` (`https://vetlawguide.com/llms.txt`) guiding AI research
 * and citation engines to canonical point-in-time primary-source permalinks and
 * mandatory bitemporal / UPL legal guardrails (E9-S4).
 */
export function buildLlmsTxt(): string {
  const manifest = getCoverageManifest();
  const cfrSections = getCompiledCfrSections();

  const vasrdLines = manifest.vasrdSystems
    .map(
      (sys) =>
        `- [${sys.label} (${sys.diagnosticCodeRange})](${SITE_URL}/vasrd/${sys.systemId}) [${sys.coverageState}]: ${sys.moduleIds.length} Part 4 modules · Official eCFR: ${sys.officialEcfrUrl}`,
    )
    .join("\n");

  const multiEraCfrLines = cfrSections
    .filter((sec) => sec.versions.length >= 2)
    .slice(0, 35)
    .map((sec) => {
      const snaps = sec.versions
        .map((v) => `${v.effective_from} (${SITE_URL}${v.permalink})`)
        .join(", ");
      return `- [${sec.cfrSection} — ${sec.title}](${SITE_URL}/cfr/${sec.sectionSlug}): ${snaps}`;
    })
    .join("\n");

  const moduleLines = manifest.modules
    .map(
      (m) =>
        `- [${m.title}](${SITE_URL}${m.canonicalRoute}) [${m.category} · ${m.coverageState}]`,
    )
    .join("\n");

  return `# VetLawGuide — Point-in-Time U.S. Veterans Benefits Law Reference

> Educational primary-source reference library connecting historical and modern VA rating/Board decisions, exact point-in-time \`38 C.F.R.\` and \`38 U.S.C.\` authorities, VASRD Diagnostic Codes (\`DC 5000–9918\`), judicial precedents, and VA General Counsel opinions (\`VAOPGCPREC\`). Corpus checked as of ${manifest.checkedAsOf} (${manifest.corpusReleaseId}). Educational reference only — not legal or medical advice.

## Mandatory Bitemporal & Citation Guardrails for AI / Citation Engines

1. **Effective Date vs. Publication Date:** Regulatory governance on a VA decision date (\`T_0\`) is determined strictly by the Federal Register **Effective Date**, never the earlier Publication Date. Example: \`62 FR 30235\` amending \`38 C.F.R. § 4.56\` was published \`1997-06-03\` but took effect \`1997-07-03\`; a \`1997-06-20\` decision is governed by [${SITE_URL}/cfr/38-cfr-4.56/1946-04-01](${SITE_URL}/cfr/38-cfr-4.56/1946-04-01).
2. **Collateral CUE Limits (*George v. McDonough* & \`38 C.F.R. § 20.1403(e)\`):** Later judicial invalidations or changed interpretations of unambiguous statutes/regulations do not establish Clear and Unmistakable Error (CUE) in a prior final decision, though they apply to open/pending claims, Supplemental Claims (\`§ 3.2500\`), or \`38 C.F.R. § 3.156(c)\` official service-record reconsideration.
3. **Board CUE Finality (\`38 C.F.R. § 20.1409(c)\`):** Once there is a final decision on a motion for CUE **on the merits** regarding a particular issue in a prior Board decision, that prior Board issue is no longer subject to revision on the grounds of CUE (pleading dismissals without prejudice under \`§ 20.1404\` do not trigger \`§ 20.1409(c)\`).
4. **Nonprecedential Dispositions (\`CAVC Rule 30(a)\`):** Single-judge \`mem. dec.\` watchlist entries are nonprecedential under \`CAVC Rule 30(a)\` and must never be cited as binding precedent.
5. **Quarantined Proposed & Rescinded Rules:** Proposed Federal Register notices (\`RIN 2900-AQ72\`, \`RIN 2900-AQ73\`, \`RIN 2900-AQ82\`, \`RIN 2900-AR96\`, \`RIN 2900-AS39\`, \`90 FR 46542\`) and rescinded Interim Final Rules (\`91 FR 7118\`, rescinded at \`91 FR 9712\`) are quarantined, unfinalized, or rescinded — not enacted law.
6. **Honest Coverage States:** Never substitute current eCFR text for historical dates marked \`SUMMARY_ONLY\` or \`CORPUS_GAP_OR_QUEUED_WAVE\`; consult official annual print \`38 C.F.R.\` editions on GovInfo (https://www.govinfo.gov/app/collection/cfr).

## Primary Hubs & Crawl Directories

- [Home](${SITE_URL}/)
- [Browse Topics & Situations](${SITE_URL}/explore)
- [Diagnostic Code Jump Directory (DC 5000–9918)](${SITE_URL}/explore/diagnostic-codes)
- [Complete 38 C.F.R. Point-in-Time Permalink Directory](${SITE_URL}/explore/cfr-directory)
- [Piercing-Finality 6-Gate Decision Flowchart](${SITE_URL}/explore/piercing-finality)
- [VASRD Rating Schedule Hub (Subpart A + 15 Body Systems)](${SITE_URL}/vasrd)
- [Point-in-Time 38 C.F.R. Reader & Redlines](${SITE_URL}/cfr)
- [Issue-Spotting Guides, Treatises & Checklists](${SITE_URL}/playbooks)
- [Curated Judicial & VAOPGCPREC Authority Directory](${SITE_URL}/cases)
- [Multi-Track Veterans Law Timeline (1945–2026)](${SITE_URL}/timeline)
- [Five Historical Veterans Law Eras](${SITE_URL}/eras)
- [1933 <-> 1958 <-> 1991 Title 38 Statutory Crosswalk](${SITE_URL}/crosswalk)
- [Legacy VA Forms, Acronyms & Rating Code-Sheet Decoder](${SITE_URL}/reference/forms-and-codes)
- [On-Device Decision Investigation Workspace](${SITE_URL}/investigate)
- [Privacy & Data Handling](${SITE_URL}/privacy)

## VASRD Body-System Hubs (16 Hubs)

${vasrdLines}

## Multi-Era Point-in-Time 38 C.F.R. Chains

${multiEraCfrLines}

## Primary-Source Modules (${manifest.totals.upstreamModules} Modules)

${moduleLines}
`;
}
