import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { enrichUpstreamCfrRecords } from "../lib/corpus/cfr-extractor";
import { loadVeteranOverlays } from "../lib/corpus/compiler";
import type { CfrVersionRecord, ManifestLock } from "../lib/corpus/types";

const REPO_ROOT = resolve(__dirname, "..");

function main(): void {
  const lockPath = resolve(REPO_ROOT, "corpus", "manifest.lock.json");
  const cfrPath = resolve(REPO_ROOT, "corpus", "upstream", "knowledge", "cfr-amendments.json");
  const overlaysDir = resolve(REPO_ROOT, "content", "overlays", "veteran");

  if (!existsSync(lockPath)) {
    console.error("[qa:drift] FAIL: Missing corpus/manifest.lock.json.");
    process.exit(1);
  }

  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as ManifestLock;
  const cfrData = JSON.parse(readFileSync(cfrPath, "utf8")) as {
    versions: CfrVersionRecord[];
  };
  const validVersionIds = new Set(
    enrichUpstreamCfrRecords(cfrData.versions).map((v) => v.version_id),
  );
  const overlays = loadVeteranOverlays(overlaysDir);

  const errors: string[] = [];

  for (const [id, overlay] of overlays.entries()) {
    const expectedHash = lock.files[overlay.upstream_path];
    if (!expectedHash) {
      errors.push(
        `Overlay "${id}" references unknown upstream_path "${overlay.upstream_path}".`,
      );
      continue;
    }
    if (overlay.upstream_sha256 !== expectedHash) {
      errors.push(
        `Overlay "${id}" has stale upstream_sha256 (${overlay.upstream_sha256.slice(0, 12)}... != ${expectedHash.slice(0, 12)}...). Re-review plain-English accuracy after upstream update!`,
      );
    }
    for (const vid of overlay.linked_version_ids) {
      if (!validVersionIds.has(vid)) {
        errors.push(
          `Overlay "${id}" references unknown CFR version_id "${vid}".`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[qa:drift] FAIL (${errors.length} drift issue(s)):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  console.log(
    `[qa:drift] PASS: Verified ${overlays.size} Veteran overlay(s) locked to ${lock.corpusReleaseId}.`,
  );
}

main();
