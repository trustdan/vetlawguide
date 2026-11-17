import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

function parseStoryStatuses(md: string): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const re = /^-\s+\[([ xX])\]\s+\*\*`(E\d+-S\d+)`/gm;
  for (const m of md.matchAll(re)) {
    const checked = (m[1] ?? " ").toLowerCase() === "x";
    const id = m[2];
    if (id) {
      map.set(id, checked);
    }
  }
  return map;
}

function collectGovernanceMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectGovernanceMdFiles(full));
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const errors: string[] = [];

  // 1. Verify BACKLOG.md <-> PLAN.md story status lockstep
  const backlogMd = readFileSync(resolve(REPO_ROOT, "BACKLOG.md"), "utf8");
  const planMd = readFileSync(resolve(REPO_ROOT, "PLAN.md"), "utf8");

  const backlogStories = parseStoryStatuses(backlogMd);
  const planStories = parseStoryStatuses(planMd);

  for (const [storyId, isDone] of backlogStories.entries()) {
    if (!planStories.has(storyId)) {
      errors.push(`Story ${storyId} exists in BACKLOG.md but is missing from PLAN.md.`);
    } else if (planStories.get(storyId) !== isDone) {
      errors.push(
        `Status drift on ${storyId}: BACKLOG.md=${isDone ? "DONE" : "TODO"}, PLAN.md=${planStories.get(storyId) ? "DONE" : "TODO"}.`,
      );
    }
  }

  for (const storyId of planStories.keys()) {
    if (!backlogStories.has(storyId)) {
      errors.push(`Story ${storyId} exists in PLAN.md but is missing from BACKLOG.md.`);
    }
  }

  // 2. Verify unbroken sequential ADR-XXXX numbering
  const adrDir = resolve(REPO_ROOT, "docs", "adr");
  if (existsSync(adrDir)) {
    const adrFiles = readdirSync(adrDir)
      .filter((f) => f.endsWith(".md"))
      .sort();
    adrFiles.forEach((f, idx) => {
      const expectedPrefix = `ADR-${String(idx + 1).padStart(4, "0")}-`;
      if (!f.startsWith(expectedPrefix)) {
        errors.push(`ADR numbering gap or format mismatch: "${f}" (expected prefix "${expectedPrefix}").`);
      }
    });
  }

  // 3. Verify .agents/agents/*.md <-> .claude/agents/*.md parity
  const agAgents = readdirSync(resolve(REPO_ROOT, ".agents", "agents"))
    .filter((f) => f.endsWith(".md"))
    .sort();
  const claudeDir = resolve(REPO_ROOT, ".claude", "agents");
  const claudeAgents = existsSync(claudeDir)
    ? readdirSync(claudeDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];

  if (JSON.stringify(agAgents) !== JSON.stringify(claudeAgents)) {
    errors.push(
      `Agent mirror drift: .agents/agents has [${agAgents.join(", ")}], while .claude/agents has [${claudeAgents.join(", ")}]. Run "pnpm corpus:sync".`,
    );
  }

  // 4. Zero-Orphan Markdown check across root + docs/ + .codex/
  const readmeMd = readFileSync(resolve(REPO_ROOT, "README.md"), "utf8");
  const rootMds = readdirSync(REPO_ROOT)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => resolve(REPO_ROOT, f));

  const docsMds = collectGovernanceMdFiles(resolve(REPO_ROOT, "docs"));
  const codexMds = collectGovernanceMdFiles(resolve(REPO_ROOT, ".codex"));

  for (const absMd of [...rootMds, ...docsMds, ...codexMds]) {
    const rel = relative(REPO_ROOT, absMd).replace(/\\/g, "/");
    if (!readmeMd.includes(rel)) {
      errors.push(`Orphan Markdown document not indexed in README.md: "${rel}"`);
    }
  }

  // 5. Prevent stale Wave 1 quickstart or pre-ADR-0007 ~84px header budget drift in active governance docs (AUD-CL-001)
  if (/Wave 1 Live vs\. Waves 2-5 Placeholders/i.test(readmeMd)) {
    errors.push('README.md contains stale "Wave 1 Live vs. Waves 2-5 Placeholders" quickstart comment.');
  }
  const agentsMd = readFileSync(resolve(REPO_ROOT, "AGENTS.md"), "utf8");
  if (/~84px/i.test(agentsMd)) {
    errors.push('AGENTS.md contains stale "~84px" header budget claim superseded by ADR-0006 & ADR-0007.');
  }

  if (errors.length > 0) {
    console.error(`[qa:historian] FAIL (${errors.length} issue(s)):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  console.log(
    `[qa:historian] PASS: ${backlogStories.size} stories in lockstep, ${agAgents.length} mirrored agents, and zero orphan docs.`,
  );
}

main();
