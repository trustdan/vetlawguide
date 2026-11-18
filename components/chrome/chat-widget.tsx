"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { useResearchContext } from "@/components/providers/research-context";
import { detectBlockingClientPii, type ChatTurnMessage } from "@/lib/chat/pii";
import { cn } from "@/lib/utils";
import { OPEN_CHAT_EVENT } from "./open-chat-link";

function ArchivalEmblem() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="h-8 w-8 shrink-0 rounded-full"
    >
      <rect width="32" height="32" rx="16" fill="#1e2022" />
      <rect x="5" y="7.5" width="22" height="17" rx="2.5" fill="#8ea38b" />
      <path
        d="M7 7C9.8 6.5 13.3 6.7 16 7.8V23.8C13.3 22.7 9.8 22.5 7 23V7Z"
        fill="#fbf9f5"
      />
      <path
        d="M25 7C22.2 6.5 18.7 6.7 16 7.8V23.8C18.7 22.7 22.2 22.5 25 23V7Z"
        fill="#fbf9f5"
      />
      <line x1="16" y1="7.8" x2="16" y2="23.8" stroke="#d4cbb8" strokeWidth="1" />
      <rect x="8.6" y="10.5" width="5.2" height="1.3" rx="0.65" fill="#8ea38b" />
      <rect x="8.6" y="13.3" width="5.2" height="1.3" rx="0.65" fill="#8ea38b" />
      <rect x="8.6" y="16.1" width="4" height="1.3" rx="0.65" fill="#8ea38b" />
      <rect x="18.2" y="10.5" width="5.2" height="1.3" rx="0.65" fill="#8ea38b" />
      <rect x="18.2" y="13.3" width="5.2" height="1.3" rx="0.65" fill="#8ea38b" />
      <rect x="19.2" y="17.2" width="7.8" height="7" rx="1.4" fill="#d9a441" />
      <rect x="20.7" y="19" width="4.8" height="3.6" rx="0.6" fill="#fbf9f5" />
    </svg>
  );
}

// Sized for a compact chat reader rather than full-page editorial headings.
const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => {
    if (href && href.startsWith("/") && !href.startsWith("//")) {
      return (
        <Link
          href={href}
          prefetch={false}
          className="font-medium text-primary underline underline-offset-2 hover:opacity-85"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-2 hover:opacity-85"
      >
        {children}
      </a>
    );
  },
  h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-border pl-2.5 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
};

const EXAMPLE_PROMPTS: ReadonlyArray<{ label: string; prompt: string }> = [
  {
    label: "38 C.F.R. § 3.156(c) service records",
    prompt: "How does 38 C.F.R. § 3.156(c) work when official service records were missing?",
  },
  {
    label: "DC 5313 or analogous codes",
    prompt: "What does Diagnostic Code 5313 or an analogous 7399-7346 code mean?",
  },
  {
    label: "George & § 20.1409(c) CUE limits",
    prompt: "How do George v. McDonough and 38 C.F.R. § 20.1409(c) affect CUE motions?",
  },
];

export function ChatWidget() {
  const pathname = usePathname();
  const { audienceMode, decisionDate } = useResearchContext();
  const isInvestigateRoute = pathname?.startsWith("/investigate") ?? false;
  // Never forward `/investigate` decision dates into `/api/chat` (Rule 05 & ADR-0003)
  const effectiveChatDecisionDate = isInvestigateRoute ? null : decisionDate;

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatTurnMessage[]>([]);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [piiWarning, setPiiWarning] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const closePanel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setOpen(false);
    setExpanded(false);
    requestAnimationFrame(() => {
      launcherRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, error, piiWarning]);

  useEffect(() => {
    function onOpenChat() {
      setOpen(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpenChat);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpenChat);
  }, []);

  useEffect(() => {
    if (!open) return;
    const focusTimer = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closePanel]);

  function resetConversation() {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setMessages([]);
    setError(null);
    setPiiWarning(null);
    setConversationId(crypto.randomUUID());
    inputRef.current?.focus();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    // Client-side PII firewall BEFORE any network request is created (ADR-0003 & Rule 05)
    const piiBlockReason = detectBlockingClientPii(text);
    if (piiBlockReason) {
      setPiiWarning(piiBlockReason);
      return;
    }

    setPiiWarning(null);
    setError(null);
    setInput("");

    const nextMessages: ChatTurnMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const requestTimeout = window.setTimeout(() => {
      controller.abort("timeout");
    }, 30000);

    try {
      const win = window as Window & { __vlgBotIdInitialized?: boolean };
      if (process.env.NEXT_PUBLIC_VERCEL_ENV && !win.__vlgBotIdInitialized) {
        win.__vlgBotIdInitialized = true;
        const { initBotId } = await import("botid/client/core");
        initBotId({ protect: [{ path: "/api/chat", method: "POST" }] });
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages,
          conversationId,
          audienceMode,
          decisionDate: effectiveChatDecisionDate,
        }),
      });

      if (!response.ok || !response.body) {
        const message = await response.text().catch(() => "");
        throw new Error(message || "Something went wrong. Please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([
          ...nextMessages,
          { role: "assistant", content: assistantText },
        ]);
      }
    } catch (err) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") {
        return;
      }
      setError(
        controller.signal.reason === "timeout"
          ? "The research assistant timed out. Please try again in a moment."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
      setMessages(nextMessages);
    } finally {
      window.clearTimeout(requestTimeout);
      abortRef.current = null;
      setSending(false);
    }
  }

  return (
    <div
      data-testid="chat-widget-root"
      className="no-print fixed right-3 bottom-3 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
    >
      {open && (
        <section
          role="dialog"
          aria-modal={expanded ? "true" : undefined}
          aria-label="VetLawGuide corpus research chat"
          data-testid="chat-widget-panel"
          className={cn(
            "flex flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated text-foreground shadow-2xl transition-all duration-200 motion-reduce:transition-none",
            expanded
              ? "fixed inset-3 z-50 sm:inset-8"
              : "h-[72vh] max-h-150 w-[calc(100vw-1.5rem)] max-w-95",
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                Corpus Research Chat
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {audienceMode === "practitioner" ? "Practitioners" : "Veterans"}{" "}
                mode ·{" "}
                {effectiveChatDecisionDate
                  ? `Law as of ${effectiveChatDecisionDate}`
                  : "All eras"}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={resetConversation}
                  aria-label="Start new chat conversation"
                  title="New conversation"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={
                  expanded ? "Shrink chat window" : "Expand chat window"
                }
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                {expanded ? (
                  <Minimize2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close chat"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3"
          >
            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="leading-relaxed">
                  Ask about historical or current{" "}
                  <code className="font-mono text-xs">38 C.F.R.</code> rules,
                  Diagnostic Codes, statutory renumbering, or VA case law.
                  Educational reference only — not legal advice.
                </p>

                {isInvestigateRoute && (
                  <p
                    data-testid="chat-investigate-isolation-note"
                    className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground"
                  >
                    Answers entered on the Investigate page stay strictly in
                    browser memory and are never sent to this chat.
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-foreground">
                    Example questions:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_PROMPTS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setInput(item.prompt);
                          setPiiWarning(null);
                          inputRef.current?.focus();
                        }}
                        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[88%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                    : "border border-border bg-surface text-foreground",
                )}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <Markdown components={markdownComponents}>
                      {m.content}
                    </Markdown>
                  ) : sending && idx === messages.length - 1 ? (
                    <span aria-live="polite" className="text-muted-foreground">
                      Searching primary sources…
                    </span>
                  ) : null
                ) : (
                  m.content
                )}
              </div>
            ))}

            {piiWarning && (
              <div
                role="alert"
                data-testid="chat-pii-warning"
                className="flex items-start gap-2 rounded-md border border-[var(--status-summary-border)] bg-[var(--status-summary-bg)] p-2.5 text-xs text-[var(--status-summary-fg)]"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{piiWarning}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                data-testid="chat-error-banner"
                className="rounded-md border border-[var(--status-gap-border)] bg-[var(--status-gap-bg)] p-2.5 text-xs text-[var(--status-gap-fg)]"
              >
                {error}
              </div>
            )}
          </div>

          <p className="border-t border-border bg-surface px-3.5 pt-2 text-xs leading-snug text-muted-foreground">
            Questions are scrubbed for SSNs/claim IDs and may be logged to
            improve guides — never enter private medical or identifying details.{" "}
            <Link
              href="/privacy"
              prefetch={false}
              className="font-medium text-primary underline underline-offset-2"
            >
              Privacy
            </Link>
            .
          </p>

          <form
            onSubmit={sendMessage}
            className="flex items-center gap-2 bg-surface p-3 pt-2"
          >
            <label htmlFor="vlg-chat-input" className="sr-only">
              Ask a Veterans Law research question
            </label>
            <input
              id="vlg-chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (piiWarning) setPiiWarning(null);
              }}
              maxLength={2000}
              placeholder="Ask about a regulation, code, or case…"
              disabled={sending}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
            />
            {sending ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop response"
                className="rounded-md border border-border bg-surface-elevated p-2 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Square className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="rounded-md bg-primary p-2 text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </form>
        </section>
      )}

      {!open && (
        <button
          ref={launcherRef}
          type="button"
          data-testid="chat-widget-launcher"
          onClick={() => setOpen(true)}
          aria-label="Open research chat"
          className="group flex items-center gap-2 rounded-full border border-border bg-surface-elevated py-1.5 pr-4 pl-1.5 text-foreground shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <ArchivalEmblem />
          <span className="text-sm font-medium">Chat</span>
        </button>
      )}
    </div>
  );
}
