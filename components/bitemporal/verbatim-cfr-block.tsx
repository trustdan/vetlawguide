import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function renderInlineFormatting(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokenRe = /(\*\*(?:(?!\*\*).)+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let k = 0;

  for (const m of line.matchAll(tokenRe)) {
    const raw = m[0];
    const idx = m.index ?? 0;
    if (idx > last) {
      parts.push(line.slice(last, idx));
    }
    if (raw.startsWith("**") && raw.endsWith("**")) {
      parts.push(
        <strong key={k} className="font-semibold text-foreground">
          {renderInlineFormatting(raw.slice(2, -2))}
        </strong>,
      );
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      parts.push(
        <em key={k} className="italic">
          {renderInlineFormatting(raw.slice(1, -1))}
        </em>,
      );
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      parts.push(
        <code
          key={k}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
        >
          {raw.slice(1, -1)}
        </code>,
      );
    }
    last = idx + raw.length;
    k += 1;
  }

  if (last < line.length) {
    parts.push(line.slice(last));
  }
  return parts;
}

function splitPipeRow(rowLine: string): string[] {
  return rowLine
    .trim()
    .split("|")
    .slice(1, -1)
    .map((c) => c.replace(/<br\s*\/?>/gi, " · ").trim());
}

export function isMarkdownPipeTable(paragraph: string): boolean {
  const lines = paragraph
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((l) => l.trimEnd());
  return (
    lines.length >= 3 &&
    (lines[0] ?? "").trim().startsWith("|") &&
    (lines[1] ?? "").includes("---") &&
    lines.every((l) => l.trim().startsWith("|"))
  );
}

export function renderPipeTableBlock(
  paragraph: string,
  key?: string | number,
): ReactNode {
  const lines = paragraph
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((l) => l.trimEnd());
  return renderPipeTable(lines, key ?? "pipe-tbl");
}

function renderPipeTable(lines: string[], key: string | number): ReactNode {
  const headers = splitPipeRow(lines[0] ?? "");
  const bodyRows = lines.slice(2).map(splitPipeRow).filter((r) => r.length > 0);
  if (headers.length === 0 || bodyRows.length === 0) return null;

  return (
    <div
      key={key}
      className="my-2 overflow-x-auto rounded-md border border-border bg-background font-sans"
    >
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-border bg-surface">
          <tr>
            {headers.map((hdr, hIdx) => (
              <th
                key={hIdx}
                scope="col"
                className="px-2.5 py-2 font-semibold text-foreground"
              >
                {renderInlineFormatting(hdr)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bodyRows.map((cells, rIdx) => (
            <tr key={rIdx} className="align-top">
              {cells.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={cn(
                    "px-2.5 py-2 leading-relaxed break-words",
                    cIdx === 0
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VerbatimCfrBlock({
  verbatimMarkdown,
  eraNote,
}: {
  verbatimMarkdown: string | null;
  eraNote?: string | null;
}) {
  const blocks = (verbatimMarkdown ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.length > 0 && (
        <blockquote className="space-y-3 rounded-lg border-l-4 border-primary bg-surface-elevated p-4 font-serif text-sm leading-relaxed text-foreground shadow-2xs sm:p-5">
          {blocks.map((block, bIdx) => {
            const lines = block.split("\n").map((l) => l.trimEnd());

            if (
              lines.length >= 3 &&
              (lines[0] ?? "").trim().startsWith("|") &&
              (lines[1] ?? "").includes("---") &&
              lines.every((l) => l.trim().startsWith("|"))
            ) {
              return renderPipeTable(lines, bIdx);
            }

            const allBullets = lines.every(
              (l) => l.trim().startsWith("* ") || /^\d+\.\s+/.test(l.trim()),
            );

            if (allBullets) {
              return (
                <ul key={bIdx} className="list-disc space-y-1.5 pl-5">
                  {lines.map((l, lIdx) => {
                    const cleaned = l.trim().replace(/^(?:\*\s+|\d+\.\s+)/, "");
                    return (
                      <li key={lIdx} className="break-words">
                        {renderInlineFormatting(cleaned)}
                      </li>
                    );
                  })}
                </ul>
              );
            }

            return (
              <div key={bIdx} className="space-y-1.5">
                {lines.map((line, lIdx) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("* ")) {
                    return (
                      <div key={lIdx} className="pl-4 break-words">
                        • {renderInlineFormatting(trimmed.slice(2))}
                      </div>
                    );
                  }
                  return (
                    <p key={lIdx} className="break-words">
                      {renderInlineFormatting(trimmed)}
                    </p>
                  );
                })}
              </div>
            );
          })}
        </blockquote>
      )}

      {eraNote && (
        <p className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">
            Archival Context &amp; Applicability Note:
          </strong>{" "}
          {renderInlineFormatting(eraNote)}
        </p>
      )}
    </div>
  );
}
