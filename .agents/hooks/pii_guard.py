#!/usr/bin/env python3
"""
Antigravity PreToolUse Lifecycle Hook: Zero-PII Repository Guard (vetlawguide).

Inspects write_file and edit_file payloads targeting the vetlawguide workspace
and blocks writes containing Social Security Number (SSN) patterns (DDD-DD-DDDD)
or labeled VA file / service number PII. Fails open on malformed stdin so
unrelated tool execution is never disrupted.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Standard SSA valid-format SSN pattern (excludes 000, 666, 900-999, 00, 0000)
SSN_RE = re.compile(r"\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b")
# Labeled VA claim / C-file number pattern (e.g., "C-12345678" or "VA File No: 123456789")
VA_FILE_RE = re.compile(
    r"\b(?:VA\s*(?:File|Claim)\s*(?:No\.?|Number|#)\s*[:=]?\s*\d{7,9}|C-\d{7,9})\b",
    re.IGNORECASE,
)


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
        workspace_paths = payload.get("workspacePaths") or []

        in_workspace = False
        if target_path_str and workspace_paths:
            try:
                resolved_target = Path(target_path_str).resolve()
                for ws in workspace_paths:
                    ws_path = Path(ws).resolve()
                    if resolved_target == ws_path or ws_path in resolved_target.parents:
                        in_workspace = True
                        break
            except Exception:
                in_workspace = False

        if in_workspace:
            text_to_scan = "\n".join(
                str(args.get(k) or "") for k in ("Content", "Replacement", "content", "replacement")
            )
            if SSN_RE.search(text_to_scan) or VA_FILE_RE.search(text_to_scan):
                print(
                    json.dumps(
                        {
                            "decision": "deny",
                            "reason": (
                                "Blocked by VetLawGuide Zero-PII Policy (.agents/rules/05-privacy-security-and-stack.md): "
                                "Detected SSN or VA claim/C-file number pattern in a tracked repository file. "
                                "Never commit real claimant identifiers into Git."
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
