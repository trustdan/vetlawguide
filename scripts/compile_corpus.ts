import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { compileCorpusFromDisk } from "../lib/corpus/compiler";

const REPO_ROOT = resolve(__dirname, "..");

function main(): void {
  const bundle = compileCorpusFromDisk(REPO_ROOT);
  const outDir = resolve(REPO_ROOT, "corpus", "generated");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, "coverage-manifest.json"),
    `${JSON.stringify(bundle.coverageManifest, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "cfr-versions.json"),
    `${JSON.stringify(bundle.cfrVersions, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "cfr-sections.json"),
    `${JSON.stringify(bundle.cfrSections, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "compiled-documents.json"),
    `${JSON.stringify(bundle.compiledDocuments, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "statutory-crosswalk.json"),
    `${JSON.stringify(bundle.statutoryCrosswalk, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "lexicon.json"),
    `${JSON.stringify(bundle.lexicon, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "precedents.json"),
    `${JSON.stringify(bundle.precedents, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "link-map.json"),
    `${JSON.stringify(bundle.linkResolutionMap, null, 2)}\n`,
    "utf8",
  );

  const { totals } = bundle.coverageManifest;
  console.log(
    `[corpus:compile] Compiled ${totals.upstreamModules} modules, ${totals.cfrVersionRecords} CFR version records (${totals.cfrSectionsIndexed} sections), ${totals.statutoryCrosswalkEntries} crosswalk rows, ${totals.lexiconEntries} lexicon terms, ${totals.precedentsIndexed} precedents, and ${totals.resolvedMarkdownLinks} internal links -> corpus/generated/.`,
  );
}

main();
