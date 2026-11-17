import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ManifestLock, UpstreamIndexEntry } from "../lib/corpus/types";
import { sha256Hex } from "../lib/corpus/compiler";

const REPO_ROOT = resolve(__dirname, "..");
const DEFAULT_UPSTREAM = resolve(REPO_ROOT, "..", "VA-law-planning");
const UPSTREAM_SOURCE = process.env.VA_LAW_PLANNING_PATH
  ? resolve(process.env.VA_LAW_PLANNING_PATH)
  : DEFAULT_UPSTREAM;

interface IngestionLedger {
  schemaVersion: string;
  activeBookmark: string;
  activeUnlockedWaves: string[];
  waves: Array<{
    waveId: string;
    title: string;
    status: string;
    description: string;
    files: string[];
  }>;
}

function resolveUpstreamGitProvenance(upstreamPath: string): {
  commitSha: string;
  branch: string;
} {
  const headRes = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: upstreamPath,
    encoding: "utf8",
  });
  const branchRes = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: upstreamPath,
    encoding: "utf8",
  });

  const branch =
    branchRes.status === 0 && branchRes.stdout.trim()
      ? branchRes.stdout.trim()
      : "uncommitted-worktree";

  if (headRes.status === 0 && headRes.stdout.trim()) {
    return { commitSha: headRes.stdout.trim(), branch };
  }

  return { commitSha: "uncommitted", branch };
}

function mirrorClaudeAgents(): number {
  const srcDir = resolve(REPO_ROOT, ".agents", "agents");
  const dstDir = resolve(REPO_ROOT, ".claude", "agents");
  mkdirSync(dstDir, { recursive: true });

  let count = 0;
  for (const fileName of readdirSync(srcDir).sort()) {
    if (!fileName.endsWith(".md")) continue;
    const raw = readFileSync(join(srcDir, fileName), "utf8");
    const isReadOnlyQa = fileName.startsWith("qa-");
    const claudeTools = isReadOnlyQa
      ? "Read, Glob, Grep, Bash"
      : "Read, Write, Edit, Glob, Grep, Bash";

    const transformed = raw
      .replace(/^subagent:.*\r?\n/m, "")
      .replace(/^mainAgent:.*\r?\n/m, "")
      .replace(/^tools:.*$/m, `tools: ${claudeTools}\nmodel: inherit`);

    writeFileSync(join(dstDir, fileName), transformed, "utf8");
    count += 1;
  }
  return count;
}

function main(): void {
  const strictUpstream = process.argv.includes("--strict-upstream");

  if (!existsSync(UPSTREAM_SOURCE)) {
    throw new Error(
      `Upstream VA-law-planning repository not found at ${UPSTREAM_SOURCE}. Set VA_LAW_PLANNING_PATH if located elsewhere.`,
    );
  }

  // Load explicit Wave Bookmark Ledger (ADR-0002)
  const ledgerPath = resolve(REPO_ROOT, "corpus", "ingestion-ledger.json");
  if (!existsSync(ledgerPath)) {
    throw new Error(`Missing corpus/ingestion-ledger.json at ${ledgerPath}.`);
  }
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as IngestionLedger;
  const unlockedSet = new Set(ledger.activeUnlockedWaves);
  const allowedPaths = new Set<string>();
  const pathToWave = new Map<string, string>();

  for (const wave of ledger.waves) {
    for (const f of wave.files) {
      const norm = f.replace(/\\/g, "/");
      pathToWave.set(norm, wave.waveId);
      if (unlockedSet.has(wave.waveId)) {
        allowedPaths.add(norm);
      }
    }
  }

  const validateScript = join(UPSTREAM_SOURCE, "scripts", "validate_kb.py");
  if (existsSync(validateScript) && strictUpstream) {
    execFileSync("python", ["-s", validateScript], {
      cwd: UPSTREAM_SOURCE,
      env: { ...process.env, PYTHONNOUSERSITE: "1" },
      stdio: "inherit",
    });
  }

  const indexJsonSrc = join(UPSTREAM_SOURCE, "knowledge", "index.json");
  if (!existsSync(indexJsonSrc)) {
    throw new Error(`Missing upstream verified manifest: ${indexJsonSrc}`);
  }

  const fullUpstreamIndex = JSON.parse(readFileSync(indexJsonSrc, "utf8")) as {
    schema_version: string;
    total_documents: number;
    entries: UpstreamIndexEntry[];
  };

  // Partition upstream entries into UNLOCKED (copied in full) vs. HELD AT GATE (metadata stub only!)
  const unlockedEntries: UpstreamIndexEntry[] = [];
  const heldAtGateStubs: Array<{
    id: string;
    title: string;
    category: UpstreamIndexEntry["category"];
    path: string;
    waveId: string;
  }> = [];

  for (const entry of fullUpstreamIndex.entries) {
    const rel = entry.path.replace(/\\/g, "/");
    if (allowedPaths.has(rel)) {
      unlockedEntries.push(entry);
    } else {
      heldAtGateStubs.push({
        id: entry.id,
        title: entry.title,
        category: entry.category,
        path: rel,
        waveId: pathToWave.get(rel) ?? "W4",
      });
    }
  }

  // Ensure every explicitly unlocked file in ingestion-ledger.json actually resolved!
  const resolvedUnlockedPaths = new Set(
    unlockedEntries.map((e) => e.path.replace(/\\/g, "/")),
  );
  for (const reqPath of allowedPaths) {
    if (!resolvedUnlockedPaths.has(reqPath)) {
      throw new Error(
        `Unlocked Wave file "${reqPath}" in corpus/ingestion-ledger.json was not found in upstream knowledge/index.json.`,
      );
    }
  }

  // Clean & copy ONLY unlocked Wave Markdown files + schemas + filtered index.json
  const destRoot = resolve(REPO_ROOT, "corpus", "upstream");
  if (existsSync(destRoot)) {
    rmSync(destRoot, { recursive: true, force: true });
  }
  mkdirSync(destRoot, { recursive: true });

  const fileHashes: Record<string, string> = {};

  for (const entry of unlockedEntries) {
    const rel = entry.path.replace(/\\/g, "/");
    const srcFile = join(UPSTREAM_SOURCE, rel);
    if (!existsSync(srcFile)) {
      throw new Error(`Verified entry "${entry.id}" missing on disk at ${srcFile}`);
    }
    const dstFile = join(destRoot, rel);
    mkdirSync(dirname(dstFile), { recursive: true });
    copyFileSync(srcFile, dstFile);
    fileHashes[rel] = sha256Hex(readFileSync(dstFile));
  }

  // Write filtered knowledge/index.json + held-at-gate.json + cfr-amendments.json
  const dstKnowledgeDir = join(destRoot, "knowledge");
  mkdirSync(dstKnowledgeDir, { recursive: true });

  const filteredIndex = {
    schema_version: fullUpstreamIndex.schema_version,
    bookmark_wave: ledger.activeBookmark,
    unlocked_waves: ledger.activeUnlockedWaves,
    total_documents: unlockedEntries.length,
    held_at_gate_documents: heldAtGateStubs.length,
    entries: unlockedEntries,
  };
  const dstIndexJson = join(dstKnowledgeDir, "index.json");
  writeFileSync(dstIndexJson, `${JSON.stringify(filteredIndex, null, 2)}\n`, "utf8");
  fileHashes["knowledge/index.json"] = sha256Hex(readFileSync(dstIndexJson));

  const dstHeldJson = join(dstKnowledgeDir, "held-at-gate.json");
  writeFileSync(
    dstHeldJson,
    `${JSON.stringify({ heldEntries: heldAtGateStubs }, null, 2)}\n`,
    "utf8",
  );
  fileHashes["knowledge/held-at-gate.json"] = sha256Hex(readFileSync(dstHeldJson));

  const srcCfrJson = join(UPSTREAM_SOURCE, "knowledge", "cfr-amendments.json");
  const dstCfrJson = join(dstKnowledgeDir, "cfr-amendments.json");
  copyFileSync(srcCfrJson, dstCfrJson);
  fileHashes["knowledge/cfr-amendments.json"] = sha256Hex(readFileSync(dstCfrJson));

  // Copy schemas/
  const srcSchemas = join(UPSTREAM_SOURCE, "schemas");
  if (existsSync(srcSchemas)) {
    for (const item of readdirSync(srcSchemas).sort()) {
      if (!item.endsWith(".json") && !item.endsWith(".yaml")) continue;
      const rel = `schemas/${item}`;
      const dstFile = join(destRoot, rel);
      mkdirSync(dirname(dstFile), { recursive: true });
      copyFileSync(join(srcSchemas, item), dstFile);
      fileHashes[rel] = sha256Hex(readFileSync(dstFile));
    }
  }

  const sortedFiles = Object.fromEntries(
    Object.entries(fileHashes).sort(([a], [b]) => a.localeCompare(b)),
  );

  const merkleInput = Object.entries(sortedFiles)
    .map(([k, v]) => `${k}:${v}`)
    .join("\n");
  const merkleSha = sha256Hex(merkleInput);

  const gitProv = resolveUpstreamGitProvenance(UPSTREAM_SOURCE);
  const effectiveSha =
    gitProv.commitSha === "uncommitted" ? `merkle-${merkleSha}` : gitProv.commitSha;

  const nowIso = new Date().toISOString();
  const checkedAsOf = nowIso.slice(0, 10);
  const shortId = merkleSha.slice(0, 8);

  const lock: ManifestLock = {
    schemaVersion: "1.0.0",
    upstreamRepo: "VA-law-planning",
    upstreamCommitSha: effectiveSha,
    upstreamBranch: `${gitProv.branch}#bookmark-${ledger.activeBookmark}`,
    syncedAt: nowIso,
    checkedAsOf,
    corpusReleaseId: `corpus-${ledger.activeBookmark.toLowerCase()}-${checkedAsOf}-${shortId}`,
    fileCount: Object.keys(sortedFiles).length,
    files: sortedFiles,
  };

  const lockPath = resolve(REPO_ROOT, "corpus", "manifest.lock.json");
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

  const claudeCount = mirrorClaudeAgents();

  console.log(
    `[corpus:sync] Bookmark ${ledger.activeBookmark}: pulled ${unlockedEntries.length} unlocked modules (${heldAtGateStubs.length} held at gate as placeholders), locked ${lock.fileCount} files (${lock.corpusReleaseId}), mirrored ${claudeCount} Claude agents.`,
  );
}

main();
