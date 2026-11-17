import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { sha256Hex } from "../lib/corpus/compiler";
import type { ManifestLock } from "../lib/corpus/types";

const REPO_ROOT = resolve(__dirname, "..");

const SSN_RE = /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/;
const VA_FILE_RE =
  /\b(?:VA\s*(?:File|Claim)\s*(?:No\.?|Number|#)\s*[:=]?\s*\d{7,9}|C-\d{7,9})\b/i;
const SECRET_RE =
  /\b(?:sk-ant-[a-zA-Z0-9_-]{20,}|sk-proj-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{30,})\b/;

const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (EXCLUDED_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (st.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const errors: string[] = [];

  // 1. Verify PreToolUse hooks are intact and enabled
  const hooksJsonPath = resolve(REPO_ROOT, ".agents", "hooks.json");
  if (!existsSync(hooksJsonPath)) {
    errors.push("Missing .agents/hooks.json.");
  } else {
    const hooks = JSON.parse(readFileSync(hooksJsonPath, "utf8")) as Record<
      string,
      { enabled?: boolean }
    >;
    if (hooks["zero-pii-repo-guard"]?.enabled === false) {
      errors.push("Hook zero-pii-repo-guard is disabled in .agents/hooks.json.");
    }
    if (hooks["upstream-corpus-immutability-guard"]?.enabled === false) {
      errors.push(
        "Hook upstream-corpus-immutability-guard is disabled in .agents/hooks.json.",
      );
    }
  }

  for (const scriptName of ["pii_guard.py", "corpus_lock_guard.py"]) {
    if (!existsSync(resolve(REPO_ROOT, ".agents", "hooks", scriptName))) {
      errors.push(`Missing hook script .agents/hooks/${scriptName}.`);
    }
  }

  // 2. Verify pnpm lockfile purity & strict Next.js TypeScript config
  for (const badLock of ["package-lock.json", "yarn.lock", "bun.lockb"]) {
    if (existsSync(resolve(REPO_ROOT, badLock))) {
      errors.push(`Banned lockfile "${badLock}" detected — VetLawGuide uses pnpm exclusively.`);
    }
  }

  const nextConfigPath = resolve(REPO_ROOT, "next.config.ts");
  if (existsSync(nextConfigPath)) {
    const nextCfg = readFileSync(nextConfigPath, "utf8");
    if (/ignoreBuildErrors\s*:\s*true/.test(nextCfg)) {
      errors.push("next.config.ts sets ignoreBuildErrors: true (prohibited by Rule 05).");
    }
    if (/ignoreDuringBuilds\s*:\s*true/.test(nextCfg)) {
      errors.push("next.config.ts sets ignoreDuringBuilds: true (prohibited by Rule 05).");
    }
  }

  // 3. Verify Zero-PII warnings in .github/ISSUE_TEMPLATE/*.yml
  const issueDir = resolve(REPO_ROOT, ".github", "ISSUE_TEMPLATE");
  for (const tpl of ["question.yml", "citation-or-date-fix.yml", "feature-idea.yml"]) {
    const p = join(issueDir, tpl);
    if (!existsSync(p)) {
      errors.push(`Missing GitHub Issue template .github/ISSUE_TEMPLATE/${tpl}.`);
    } else {
      const txt = readFileSync(p, "utf8");
      if (!/SSN/i.test(txt)) {
        errors.push(`.github/ISSUE_TEMPLATE/${tpl} is missing explicit Zero-PII / SSN warning.`);
      }
    }
  }

  // 4. Verify SHA-256 integrity of every file in corpus/upstream/
  const lockPath = resolve(REPO_ROOT, "corpus", "manifest.lock.json");
  const upstreamDir = resolve(REPO_ROOT, "corpus", "upstream");
  if (!existsSync(lockPath)) {
    errors.push("Missing corpus/manifest.lock.json.");
  } else {
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as ManifestLock;
    const diskFiles = walkFiles(upstreamDir);
    const seenRel = new Set<string>();

    for (const absFile of diskFiles) {
      const rel = relative(upstreamDir, absFile).replace(/\\/g, "/");
      seenRel.add(rel);
      const expected = lock.files[rel];
      if (!expected) {
        errors.push(`Untracked file in corpus/upstream/: ${rel}`);
        continue;
      }
      const actual = sha256Hex(readFileSync(absFile));
      if (actual !== expected) {
        errors.push(
          `Tampered upstream file corpus/upstream/${rel} (SHA-256 mismatch vs. manifest.lock.json).`,
        );
      }
    }

    for (const rel of Object.keys(lock.files)) {
      if (!seenRel.has(rel)) {
        errors.push(`Missing upstream file listed in manifest.lock.json: ${rel}`);
      }
    }
  }

  // 5. Scan repository text files for SSNs, VA file numbers, or leaked API keys
  for (const absFile of walkFiles(REPO_ROOT)) {
    const rel = relative(REPO_ROOT, absFile).replace(/\\/g, "/");
    if (rel === "pnpm-lock.yaml") continue;
    if (rel.endsWith("pii_guard.py") || rel.endsWith("security_pii_audit.ts") || rel.includes("tests/")) {
      continue;
    }
    if (!/\.(md|mdx|ts|tsx|js|mjs|json|ya?ml|py)$/i.test(rel)) continue;

    const text = readFileSync(absFile, "utf8");
    if (SSN_RE.test(text)) {
      errors.push(`${rel}: Potential SSN pattern detected (Zero-PII violation).`);
    }
    if (VA_FILE_RE.test(text)) {
      errors.push(`${rel}: Potential VA File / Claim number detected (Zero-PII violation).`);
    }
    if (SECRET_RE.test(text)) {
      errors.push(`${rel}: Potential hardcoded API secret detected.`);
    }
  }

  if (errors.length > 0) {
    console.error(`[qa:security] FAIL (${errors.length} issue(s)):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  console.log(
    "[qa:security] PASS: Hooks, pnpm lock purity, upstream SHA-256 digests, and Zero-PII scan clean.",
  );
}

main();
