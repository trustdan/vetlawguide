#!/usr/bin/env python3
"""
Antigravity PreToolUse Lifecycle Hook: Upstream Corpus Immutability Guard.

Blocks direct write_file / edit_file calls targeting corpus/upstream/** inside
vetlawguide. Upstream legal Markdown and JSON ledgers belong in VA-law-planning
and must enter vetlawguide exclusively via `pnpm corpus:sync` (ADR-0001).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print(json.dumps({"decision": "allow"}))
            return 0

        payload = json.loads(raw)
        tool_call = payload.get("toolCall") or {}
        args = tool_call.get("args") or {}
        target_path_str = args.get("Path") or args.get("path") or ""

        if target_path_str:
            normalized = Path(target_path_str).resolve().as_posix().lower()
            if "/corpus/upstream/" in normalized or normalized.endswith("/corpus/upstream"):
                print(
                    json.dumps(
                        {
                            "decision": "deny",
                            "reason": (
                                "Blocked by Upstream Corpus Immutability Rule (ADR-0001): "
                                "`corpus/upstream/` is a read-only SHA-256-pinned snapshot of `VA-law-planning`. "
                                "Edit primary legal sources in `C:\\Users\\Dan\\VA-law-planning` and run `pnpm corpus:sync`, "
                                "or place web/Veteran translations in `content/overlays/veteran/`."
                            ),
                        }
                    )
                )
                return 0

        print(json.dumps({"decision": "allow"}))
        return 0
    except Exception:
        print(json.dumps({"decision": "allow"}))
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
