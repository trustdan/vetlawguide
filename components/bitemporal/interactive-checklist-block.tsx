"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { InlineLegalText } from "./inline-legal-text";

export function InteractiveChecklistBlock({
  items,
  blockId,
}: {
  items: string[];
  blockId: string;
}) {
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const checkedCount = Object.values(checkedMap).filter(Boolean).length;

  function toggleItem(idx: number) {
    setCheckedMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2 text-xs">
        <span className="font-mono font-semibold text-primary">
          Interactive Session Checklist ({checkedCount}/{items.length} checked · browser memory only)
        </span>
        {checkedCount > 0 && (
          <button
            type="button"
            onClick={() => setCheckedMap({})}
            className="inline-flex items-center gap-1 rounded border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Clear Checks</span>
          </button>
        )}
      </div>

      <ul className="space-y-2.5 text-sm leading-relaxed">
        {items.map((item, idx) => {
          const id = `${blockId}-item-${idx}`;
          const isChecked = Boolean(checkedMap[idx]);
          return (
            <li key={id} className="flex items-start gap-2.5">
              <input
                id={id}
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(idx)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary focus-visible:outline-2 focus-visible:outline-primary"
              />
              <label
                htmlFor={id}
                className={
                  isChecked
                    ? "cursor-pointer text-muted-foreground line-through"
                    : "cursor-pointer text-foreground"
                }
              >
                <InlineLegalText text={item} />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
