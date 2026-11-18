"use client";

import type { ReactNode } from "react";

export const OPEN_CHAT_EVENT = "vlg:open-chat";

export function OpenChatLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}
