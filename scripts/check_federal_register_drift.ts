import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

interface FederalRegisterDoc {
  document_number: string;
  title: string;
  type: string;
  publication_date: string;
  effective_on: string | null;
  citation: string | null;
  html_url: string;
  regulation_id_number_info?: Record<string, unknown>;
}

const WATCHED_PARTS = [3, 4, 14, 20] as const;

async function fetchRecentTitle38Docs(sinceDate: string): Promise<FederalRegisterDoc[]> {
  const params = new URLSearchParams();
  params.set("per_page", "50");
  params.set("order", "newest");
  params.set("conditions[publication_date][gte]", sinceDate);
  params.set("conditions[cfr][title]", "38");

  const url = `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Federal Register API HTTP ${res.status}`);
  }
  const json = (await res.json()) as { results?: FederalRegisterDoc[] };
  return json.results ?? [];
}

function loadKnownCorpusTokens(): string {
  const cfrPath = resolve(REPO_ROOT, "corpus", "upstream", "knowledge", "cfr-amendments.json");
  const idxPath = resolve(REPO_ROOT, "corpus", "upstream", "knowledge", "index.json");
  const a = existsSync(cfrPath) ? readFileSync(cfrPath, "utf8") : "";
  const b = existsSync(idxPath) ? readFileSync(idxPath, "utf8") : "";
  return `${a}\n${b}`;
}

async function main(): Promise<void> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  console.log(
    `[fr:watch] Checking Federal Register Title 38 updates since ${sixtyDaysAgo} (watched parts: ${WATCHED_PARTS.join(", ")})...`,
  );

  const docs = await fetchRecentTitle38Docs(sixtyDaysAgo);
  const corpusBlob = loadKnownCorpusTokens();

  const relevantUnindexed = docs.filter((doc) => {
    const touchesWatched =
      /\bPart\s+(?:3|4|14|20)\b|\b38\s+CFR\s+(?:3|4|14|20)\b/i.test(doc.title) ||
      doc.type === "Rule" ||
      doc.type === "Proposed Rule";
    if (!touchesWatched) return false;
    const citeToken = doc.citation ?? doc.document_number;
    return !corpusBlob.includes(citeToken) && !corpusBlob.includes(doc.document_number);
  });

  if (relevantUnindexed.length === 0) {
    console.log("[fr:watch] No unindexed Title 38 rulemakings detected.");
    return;
  }

  console.log(`[fr:watch] Found ${relevantUnindexed.length} candidate Federal Register notice(s):`);
  for (const d of relevantUnindexed) {
    console.log(
      `- [${d.type}] ${d.citation ?? d.document_number} (pub. ${d.publication_date}, eff. ${d.effective_on ?? "N/A"}): ${d.title} -> ${d.html_url}`,
    );
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPOSITORY;
  if (ghToken && ghRepo && process.env.GITHUB_ACTIONS === "true") {
    const issueTitle = `[FR Drift Watch] ${relevantUnindexed.length} Title 38 Federal Register item(s) to triage`;
    const bodyLines = [
      "Automated Federal Register check (`scripts/check_federal_register_drift.ts`) detected recent Title 38 notices not yet cited in `cfr-amendments.json` or `index.json`:",
      "",
      ...relevantUnindexed.map(
        (d) =>
          `- **${d.type}** — \`${d.citation ?? d.document_number}\` (Published \`${d.publication_date}\`, Effective \`${d.effective_on ?? "TBD/Proposal"}\`): [${d.title}](${d.html_url})`,
      ),
      "",
      "### Triage Action",
      "1. If **Proposed Rule**, add to `unfinalized_proposals` quarantine watchlist in `VA-law-planning`.",
      "2. If **Final Rule**, verify verbatim text and publication-vs.-effective dates via `cfr-archivist` in `VA-law-planning`, then run `pnpm corpus:sync` in `vetlawguide`.",
    ];

    await fetch(`https://api.github.com/repos/${ghRepo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: bodyLines.join("\n"),
        labels: ["legal-provenance"],
      }),
    });
  }
}

main().catch((err: unknown) => {
  console.error("[fr:watch] Error:", err);
  process.exit(1);
});
