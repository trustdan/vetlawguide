---
name: author-veteran-overlay
description: >-
  Use this skill when authoring or updating a plain-English Veteran companion overlay
  in content/overlays/veteran/ for an upstream VA-law-planning module, ensuring
  SHA-256 lockstep, zero CFR text duplication, inline acronym tooltips, and UPL safety.
---

# Authoring Hash-Locked Veteran Overlays (`content/overlays/veteran/`)

## Schema & Structure (`content/overlays/veteran/<upstream-id>.json`)

Every Veteran overlay file MUST include:
- `upstream_id`: Exact `id` from `corpus/upstream/knowledge/index.json` (e.g., `"playbook-01-penetrating-wounds-scars-vs-muscles"`).
- `upstream_path`: Relative path inside `corpus/upstream/` (e.g., `"playbooks/01-penetrating-wounds-scars-vs-muscles.md"`).
- `upstream_sha256`: Exact SHA-256 hex digest from `corpus/manifest.lock.json`.
- `linked_version_ids`: Array of canonical `version_id` keys from `cfr-amendments.json` so *"Inspect exact legal authority"* links directly to verbatim snapshots.
- `reviewed_at`: `YYYY-MM-DD` date of editorial/UPL review.
- `plain_english_title`: Clear, human-centered title (zero unexplained acronyms).
- `what_this_means`: Empathetic plain-English explanation of the rule or situation.
- `record_clues`: Concrete paperwork clues Veterans or Survivors may recognize (e.g., Purple Heart on `DD-214`, `"GSW"` or `"T&T"` on hospital sheets, `0%` scar code `7804`).
- `important_cautions`: Accurate, non-directive cautions reflecting upstream `kill_switches` (e.g., why decision dates matter, `120-day` appeal deadlines, and `38 C.F.R. § 20.1409(c)`'s bar on a second final merits CUE motion per Board decision issue).
- `questions_for_representative`: Printable checklist of specific questions and records to discuss with an accredited VSO, claims agent, or attorney.

## Mandatory Guardrails
1. **Never duplicate verbatim `38 C.F.R.` paragraphs** inside the JSON—reference `linked_version_ids`.
2. **Never give individualized legal advice** (*"You have CUE"*, *"File X immediately"*).
3. Run `pnpm qa:drift && pnpm qa:upl && pnpm qa:legal` and confirm `0` errors.
