---
name: sync-and-compile-corpus
description: >-
  Use this skill when syncing a new snapshot from C:\Users\Dan\VA-law-planning into
  corpus/upstream/, updating corpus/manifest.lock.json, compiling corpus/generated/
  (CFR permalinks, statutory crosswalk, acronym lexicon, coverage-manifest.json), or
  triaging translation SHA-256 drift alerts.
---

# Sync and Compile Corpus (`VA-law-planning` -> `vetlawguide`)

## Procedure

1. **Validate Upstream `VA-law-planning` Integrity First:**
   ```powershell
   $env:PYTHONNOUSERSITE = "1"
   python -s C:\Users\Dan\VA-law-planning\scripts\validate_kb.py
   ```
   Confirm `0` errors upstream before importing into `vetlawguide`.

2. **Sync & Lock Snapshot (`corpus/upstream/` + `corpus/manifest.lock.json`):**
   ```powershell
   pnpm corpus:sync
   ```
   *(Never hand-edit files inside `corpus/upstream/`—`corpus_lock_guard.py` will block direct writes).*

3. **Compile Deterministic Web Entities (`corpus/generated/`):**
   ```powershell
   pnpm corpus:compile
   ```
   Verify `corpus/generated/coverage-manifest.json` reports:
   - Valid `supersedes` / `superseded_by` CFR chains with zero unexpected overlaps;
   - All 15 VASRD Body Systems and 13 Practice Domains classified into one of the 4 coverage states (`VERBATIM_VERIFIED`, `SUMMARY_ONLY`, `PLAIN_ENGLISH_IN_PROGRESS`, `CORPUS_GAP_OR_QUEUED_WAVE`);
   - Zero unresolved internal Markdown links.

4. **Check Audience Translation Drift & Tests:**
   ```powershell
   pnpm qa:drift
   pnpm test
   ```
   If `pnpm qa:drift` flags any `content/overlays/veteran/*.json` file whose `upstream_sha256` changed, activate the `author-veteran-overlay` skill to review and update the plain-English summary.
