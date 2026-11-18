import { resolve } from "node:path";
import { runStaticSeoAudit } from "../lib/seo/crawl-audit";

const REPO_ROOT = resolve(__dirname, "..");

function main(): void {
  const report = runStaticSeoAudit(REPO_ROOT);

  if (report.errors.length > 0) {
    console.error(
      `[qa:seo] FAIL (${report.errors.length} issue(s)):\n- ${report.errors.join("\n- ")}`,
    );
    process.exit(1);
  }

  console.log(
    `[qa:seo] PASS: ${report.totalCanonicalRoutes} canonical routes verified, /llms.txt valid, JSON-LD & slogans clean, max crawl depth from "/" = ${report.maxCrawlDepthFromHome} clicks (<= 2).`,
  );
}

main();
