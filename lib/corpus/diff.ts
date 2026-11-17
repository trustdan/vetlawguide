import type {
  AlignedRedlineRow,
  RedlineComparisonResult,
  RedlineSegment,
} from "./types";

const TOKEN_RE = /(\s+|§+|[A-Za-z0-9]+(?:[-–.'/][A-Za-z0-9]+)*%?|\S)/g;

const SUPERSCRIPT_DIGITS: Readonly<Record<string, string>> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/**
 * Pure browser- and server-safe helper normalizing `$^{1}$` -> `¹` and stripping
 * inline Markdown emphasis/code/link delimiters (`***`, `**`, `*`, `` ` ``, `[label](url)`).
 */
export function stripMarkdownSyntax(input: string): string {
  let out = input
    .replace(/\$\^\{(\d+)\}\$/g, (_m, digits: string) =>
      digits
        .split("")
        .map((d) => SUPERSCRIPT_DIGITS[d] ?? d)
        .join(""),
    )
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

  for (let pass = 0; pass < 6; pass += 1) {
    const next = out
      .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1");
    if (next === out) break;
    out = next;
  }

  return out
    .replace(/\*{2,}/g, "")
    .replace(/(^|[\s([{“"'])\*(?=\S)/g, "$1")
    .replace(/(?<=\S)\*(?=$|[\s)\]}.,;:!?”"'])/g, "")
    .trim();
}

/**
 * Splits legal prose into lossless tokens (words, citations, section symbols,
 * punctuation, and exact whitespace runs) so joining `equal + removed` reproduces
 * `beforeText` byte-for-byte and joining `equal + added` reproduces `afterText`.
 */
export function tokenizeLegalText(text: string): string[] {
  if (!text) return [];
  return text.match(TOKEN_RE) ?? [text];
}

function mergeAdjacentSegments(segments: RedlineSegment[]): RedlineSegment[] {
  const merged: RedlineSegment[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === seg.kind) {
      prev.text += seg.text;
    } else {
      merged.push({ kind: seg.kind, text: seg.text });
    }
  }
  return merged;
}

/**
 * Deterministic Longest Common Subsequence (LCS) token diff for legal text.
 */
export function computeInlineRedline(
  beforeText: string,
  afterText: string,
): RedlineSegment[] {
  if (beforeText === afterText) {
    return beforeText ? [{ kind: "equal", text: beforeText }] : [];
  }
  if (!beforeText) {
    return afterText ? [{ kind: "added", text: afterText }] : [];
  }
  if (!afterText) {
    return [{ kind: "removed", text: beforeText }];
  }

  const a = tokenizeLegalText(beforeText);
  const b = tokenizeLegalText(afterText);
  const n = a.length;
  const m = b.length;

  // Trim identical leading and trailing token runs for fast exact-match performance
  let start = 0;
  while (start < n && start < m && a[start] === b[start]) {
    start += 1;
  }

  let endA = n - 1;
  let endB = m - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }

  const prefixText = a.slice(0, start).join("");
  const suffixText = a.slice(endA + 1).join("");
  const midA = a.slice(start, endA + 1);
  const midB = b.slice(start, endB + 1);

  const rawSegments: RedlineSegment[] = [];
  if (prefixText) {
    rawSegments.push({ kind: "equal", text: prefixText });
  }

  const lenA = midA.length;
  const lenB = midB.length;

  if (lenA === 0 && lenB > 0) {
    rawSegments.push({ kind: "added", text: midB.join("") });
  } else if (lenB === 0 && lenA > 0) {
    rawSegments.push({ kind: "removed", text: midA.join("") });
  } else if (lenA > 0 && lenB > 0) {
    const cols = lenB + 1;
    const dp = new Uint32Array((lenA + 1) * cols);

    for (let i = lenA - 1; i >= 0; i -= 1) {
      const tokA = midA[i];
      const rowOffset = i * cols;
      const nextRowOffset = (i + 1) * cols;
      for (let j = lenB - 1; j >= 0; j -= 1) {
        if (tokA === midB[j]) {
          dp[rowOffset + j] = (dp[nextRowOffset + j + 1] ?? 0) + 1;
        } else {
          const down = dp[nextRowOffset + j] ?? 0;
          const right = dp[rowOffset + j + 1] ?? 0;
          dp[rowOffset + j] = down >= right ? down : right;
        }
      }
    }

    let i = 0;
    let j = 0;
    while (i < lenA && j < lenB) {
      if (midA[i] === midB[j]) {
        rawSegments.push({ kind: "equal", text: midA[i]! });
        i += 1;
        j += 1;
      } else if ((dp[(i + 1) * cols + j] ?? 0) >= (dp[i * cols + j + 1] ?? 0)) {
        rawSegments.push({ kind: "removed", text: midA[i]! });
        i += 1;
      } else {
        rawSegments.push({ kind: "added", text: midB[j]! });
        j += 1;
      }
    }
    while (i < lenA) {
      rawSegments.push({ kind: "removed", text: midA[i]! });
      i += 1;
    }
    while (j < lenB) {
      rawSegments.push({ kind: "added", text: midB[j]! });
      j += 1;
    }
  }

  if (suffixText) {
    rawSegments.push({ kind: "equal", text: suffixText });
  }

  return mergeAdjacentSegments(rawSegments);
}

function splitLegalParagraphs(markdown: string): string[] {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.replace(/^>\s?/, "").trimEnd())
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

function paragraphSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/[^a-z0-9§]+/)
      .filter((w) => w.length >= 3),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/[^a-z0-9§]+/)
      .filter((w) => w.length >= 3),
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared += 1;
  }
  const union = wordsA.size + wordsB.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Aligns regulatory paragraphs between two versions using similarity-weighted DP
 * so side-by-side redline views pair amended subsections cleanly while isolating
 * newly added paragraphs (such as post-July 3, 1997 § 4.56(a)–(b) floors).
 */
export function computeParagraphAlignedRedline(
  beforeMarkdown: string,
  afterMarkdown: string,
): AlignedRedlineRow[] {
  const parasA = splitLegalParagraphs(beforeMarkdown);
  const parasB = splitLegalParagraphs(afterMarkdown);
  const n = parasA.length;
  const m = parasB.length;

  const MATCH_THRESHOLD = 0.22;
  const cols = m + 1;
  const score = new Float64Array((n + 1) * cols);

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const sim = paragraphSimilarity(parasA[i]!, parasB[j]!);
      const pairGain = sim >= MATCH_THRESHOLD ? sim + 0.5 : -1;
      const skipA = score[(i + 1) * cols + j] ?? 0;
      const skipB = score[i * cols + j + 1] ?? 0;
      let best = skipA >= skipB ? skipA : skipB;
      if (pairGain > 0) {
        const pairScore = pairGain + (score[(i + 1) * cols + j + 1] ?? 0);
        if (pairScore >= best) {
          best = pairScore;
        }
      }
      score[i * cols + j] = best;
    }
  }

  const rows: AlignedRedlineRow[] = [];
  let i = 0;
  let j = 0;
  let rowIndex = 0;

  while (i < n && j < m) {
    const pA = parasA[i]!;
    const pB = parasB[j]!;
    const sim = paragraphSimilarity(pA, pB);
    const pairGain = sim >= MATCH_THRESHOLD ? sim + 0.5 : -1;
    const currentBest = score[i * cols + j] ?? 0;
    const pairCandidate =
      pairGain > 0 ? pairGain + (score[(i + 1) * cols + j + 1] ?? 0) : -1;

    if (pairGain > 0 && Math.abs(currentBest - pairCandidate) < 1e-9) {
      const isExact = pA === pB;
      rows.push({
        rowIndex,
        changeKind: isExact ? "unchanged" : "modified",
        beforeParagraph: pA,
        afterParagraph: pB,
        inlineSegments: computeInlineRedline(pA, pB),
      });
      rowIndex += 1;
      i += 1;
      j += 1;
    } else if ((score[(i + 1) * cols + j] ?? 0) >= (score[i * cols + j + 1] ?? 0)) {
      rows.push({
        rowIndex,
        changeKind: "removed",
        beforeParagraph: pA,
        afterParagraph: null,
        inlineSegments: [{ kind: "removed", text: pA }],
      });
      rowIndex += 1;
      i += 1;
    } else {
      rows.push({
        rowIndex,
        changeKind: "added",
        beforeParagraph: null,
        afterParagraph: pB,
        inlineSegments: [{ kind: "added", text: pB }],
      });
      rowIndex += 1;
      j += 1;
    }
  }

  while (i < n) {
    const pA = parasA[i]!;
    rows.push({
      rowIndex,
      changeKind: "removed",
      beforeParagraph: pA,
      afterParagraph: null,
      inlineSegments: [{ kind: "removed", text: pA }],
    });
    rowIndex += 1;
    i += 1;
  }

  while (j < m) {
    const pB = parasB[j]!;
    rows.push({
      rowIndex,
      changeKind: "added",
      beforeParagraph: null,
      afterParagraph: pB,
      inlineSegments: [{ kind: "added", text: pB }],
    });
    rowIndex += 1;
    j += 1;
  }

  return rows;
}

function countNonWhitespaceWords(text: string): number {
  return tokenizeLegalText(text).filter((t) => /\S/.test(t)).length;
}

export function compareCfrVersions(
  beforeLabel: string,
  beforeMarkdown: string,
  afterLabel: string,
  afterMarkdown: string,
): RedlineComparisonResult {
  const cleanBefore = splitLegalParagraphs(beforeMarkdown).join("\n\n");
  const cleanAfter = splitLegalParagraphs(afterMarkdown).join("\n\n");
  const inlineSegments = computeInlineRedline(cleanBefore, cleanAfter);
  const alignedRows = computeParagraphAlignedRedline(beforeMarkdown, afterMarkdown);

  let addedTokens = 0;
  let removedTokens = 0;
  let unchangedTokens = 0;

  for (const seg of inlineSegments) {
    const wc = countNonWhitespaceWords(seg.text);
    if (seg.kind === "added") addedTokens += wc;
    else if (seg.kind === "removed") removedTokens += wc;
    else unchangedTokens += wc;
  }

  const changedParagraphs = alignedRows.filter(
    (r) => r.changeKind !== "unchanged",
  ).length;

  return {
    beforeLabel,
    afterLabel,
    inlineSegments,
    alignedRows,
    stats: {
      addedTokens,
      removedTokens,
      unchangedTokens,
      changedParagraphs,
    },
  };
}
