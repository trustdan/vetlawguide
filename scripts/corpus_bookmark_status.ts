import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CoverageManifest, ManifestLock } from "../lib/corpus/types";

const REPO_ROOT = resolve(__dirname, "..");

function main(): void {
  const ledger = JSON.parse(
    readFileSync(resolve(REPO_ROOT, "corpus", "ingestion-ledger.json"), "utf8"),
  ) as {
    activeBookmark: string;
    activeUnlockedWaves: string[];
    waves: Array<{
      waveId: string;
      title: string;
      status: string;
      files: string[];
    }>;
  };

  const lock = JSON.parse(
    readFileSync(resolve(REPO_ROOT, "corpus", "manifest.lock.json"), "utf8"),
  ) as ManifestLock;

  const manifest = JSON.parse(
    readFileSync(
      resolve(REPO_ROOT, "corpus", "generated", "coverage-manifest.json"),
      "utf8",
    ),
  ) as CoverageManifest;

  console.log("==================================================================");
  console.log(`VetLawGuide Corpus Ingestion Bookmark — Active Wave: ${ledger.activeBookmark}`);
  console.log(`Release Stamp: ${lock.corpusReleaseId} (Checked ${lock.checkedAsOf})`);
  console.log(
    `Pulled Live Modules: ${manifest.totals.upstreamModules} | Held at Gate (Placeholders): ${manifest.totals.heldAtGateModules} | Veteran Overlays: ${manifest.totals.veteranOverlaysAuthored}`,
  );
  console.log("==================================================================");

  for (const w of ledger.waves) {
    const unlocked = ledger.activeUnlockedWaves.includes(w.waveId);
    const marker = unlocked ? "[PULLED & LIVE]" : "[PLACEHOLDER]";
    console.log(
      `${marker.padEnd(16)} ${w.waveId} — ${w.title} (${w.files.length > 0 ? `${w.files.length} explicit files` : w.status})`,
    );
  }
}

main();
