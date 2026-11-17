import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileCorpusFromDisk } from "@/lib/corpus/compiler";
import { resolveWave1CfrHref } from "@/lib/corpus/temporal";

const REPO_ROOT = resolve(__dirname, "..", "..");
const HOOKS_DIR = resolve(REPO_ROOT, ".agents");

function walkTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function invokeHook(scriptRelPath: string, payload: unknown): { decision: string; reason?: string } {
  const proc = spawnSync("python", ["-s", scriptRelPath], {
    cwd: HOOKS_DIR,
    env: { ...process.env, PYTHONNOUSERSITE: "1" },
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  expect(proc.status).toBe(0);
  return JSON.parse(proc.stdout.trim()) as { decision: string; reason?: string };
}

describe("Repository Architecture, Lifecycle Hooks & Live Corpus Integrity", () => {
  it("blocks SSN and VA file number PII in write_file payloads via pii_guard.py", () => {
    // Construct test string dynamically so static repo scanners stay clean
    const syntheticSsn = ["123", "45", "6789"].join("-");
    const denySsn = invokeHook("hooks/pii_guard.py", {
      workspacePaths: [REPO_ROOT],
      toolCall: {
        name: "write_file",
        args: {
          Path: resolve(REPO_ROOT, "content", "test.md"),
          Content: `Claimant record ${syntheticSsn}`,
        },
      },
    });
    expect(denySsn.decision).toBe("deny");

    const allowClean = invokeHook("hooks/pii_guard.py", {
      workspacePaths: [REPO_ROOT],
      toolCall: {
        name: "write_file",
        args: {
          Path: resolve(REPO_ROOT, "content", "test.md"),
          Content: "38 C.F.R. § 4.56 (62 FR 30235) — Diagnostic Code 5313.",
        },
      },
    });
    expect(allowClean.decision).toBe("allow");
  });

  it("blocks direct agent edits to corpus/upstream/** via corpus_lock_guard.py", () => {
    const denyUpstream = invokeHook("hooks/corpus_lock_guard.py", {
      workspacePaths: [REPO_ROOT],
      toolCall: {
        name: "edit_file",
        args: {
          Path: resolve(REPO_ROOT, "corpus", "upstream", "playbooks", "01-test.md"),
          Replacement: "mutated",
        },
      },
    });
    expect(denyUpstream.decision).toBe("deny");

    const allowOverlay = invokeHook("hooks/corpus_lock_guard.py", {
      workspacePaths: [REPO_ROOT],
      toolCall: {
        name: "write_file",
        args: {
          Path: resolve(REPO_ROOT, "content", "overlays", "veteran", "sample.json"),
          Content: "{}",
        },
      },
    });
    expect(allowOverlay.decision).toBe("allow");
  });

  it("compiles the complete W5 VA-law-planning corpus (111 modules, 16 VASRD hubs, 13 Practice Domains, unique Windows-safe CFR permalinks)", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    expect(bundle.coverageManifest.activeBookmarkWave).toBe("W5");
    expect(bundle.coverageManifest.totals.upstreamModules).toBe(111);
    expect(bundle.coverageManifest.totals.heldAtGateModules).toBe(0);
    expect(bundle.coverageManifest.totals.veteranOverlaysAuthored).toBe(111);
    expect(bundle.coverageManifest.vasrdSystems).toHaveLength(16);
    expect(bundle.coverageManifest.practiceDomains).toHaveLength(13);

    for (const sys of bundle.coverageManifest.vasrdSystems) {
      expect(
        sys.moduleIds.length,
        `VASRD system ${sys.systemId} should have >=1 unlocked module`,
      ).toBeGreaterThan(0);
      expect(sys.coverageState).toBe("VERBATIM_VERIFIED");
    }

    for (const dom of bundle.coverageManifest.practiceDomains) {
      expect(
        dom.moduleIds.length,
        `Practice domain ${dom.domainId} should have >=1 unlocked module`,
      ).toBeGreaterThan(0);
      expect(dom.coverageState).toBe("VERBATIM_VERIFIED");
    }

    const seenPermalinks = new Set<string>();
    for (const sec of bundle.cfrSections) {
      expect(sec.sectionSlug.length).toBeLessThanOrEqual(48);
      for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
        expect(seenPermalinks.has(ver.permalink)).toBe(false);
        seenPermalinks.add(ver.permalink);
      }
    }

    // 106 AST-compiled reader documents + 5 Wave 1 direct CFR entity modules = 111
    expect(bundle.compiledDocuments).toHaveLength(106);
    const validCfrRoutes = new Set([
      "/cfr",
      ...bundle.cfrSections.map((s) => `/cfr/${s.sectionSlug}`),
    ]);
    for (const doc of bundle.compiledDocuments) {
      expect(doc.blocks.length, `Document ${doc.id} has empty AST blocks`).toBeGreaterThan(0);
      for (const cite of doc.cfrCitations) {
        const { href } = resolveWave1CfrHref(cite);
        expect(
          validCfrRoutes.has(href),
          `resolveWave1CfrHref("${cite}") returned nonexistent static route "${href}"`,
        ).toBe(true);
      }
    }

    expect(bundle.coverageManifest.totals.statutoryCrosswalkEntries).toBeGreaterThan(10);
    expect(bundle.coverageManifest.totals.lexiconEntries).toBeGreaterThan(10);
  });

  it("enforces Pragmatic Programmer orthogonality (pure lib/ engines never import React/Next/UI) and zero Broken Windows", () => {
    const pureDomainDirs = [
      resolve(REPO_ROOT, "lib", "corpus"),
      resolve(REPO_ROOT, "lib", "screener"),
    ];
    const uiCouplingRe =
      /\bfrom\s+["'](?:react|react-dom|next(?:\/[^"']*)?|@\/components\/[^"']+|@\/app\/[^"']+)["']/;

    for (const dir of pureDomainDirs) {
      for (const file of walkTsFiles(dir)) {
        const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
        const src = readFileSync(file, "utf8");
        expect(
          uiCouplingRe.test(src),
          `Orthogonality violation in ${rel}: pure domain engine must not import React, Next.js, or UI components.`,
        ).toBe(false);
      }
    }

    const nodeRuntimeRe = /\bfrom\s+["'](?:node:|fs\b|path\b|child_process\b)/;
    for (const file of walkTsFiles(resolve(REPO_ROOT, "lib", "screener"))) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
      const src = readFileSync(file, "utf8");
      expect(
        nodeRuntimeRe.test(src),
        `Browser-memory purity violation in ${rel}: lib/screener/ must remain 100% browser-safe pure TypeScript without Node.js runtime imports.`,
      ).toBe(false);
    }

    const brokenWindowDirs = ["lib", "app", "components", "scripts"].map((d) =>
      resolve(REPO_ROOT, d),
    );
    const anyEscapeRe = /(?::\s*any\b|\bas\s+any\b|@ts-ignore\b)/;

    for (const dir of brokenWindowDirs) {
      for (const file of walkTsFiles(dir)) {
        const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
        const src = readFileSync(file, "utf8");
        expect(
          anyEscapeRe.test(src),
          `Broken Window in ${rel}: explicit 'any' or '@ts-ignore' is prohibited by Rule 00.`,
        ).toBe(false);
      }
    }
  });
});
