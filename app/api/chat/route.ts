import { NextRequest, after } from "next/server";
import OpenAI from "openai";
import { checkBotId } from "botid/server";
import {
  resolveClientId,
  sendMeasurementProtocolEvent,
} from "@/lib/analytics/measurement-protocol";
import { logChatQuestion } from "@/lib/chat/log-conversation";
import { redactMessagesPii, type ChatTurnMessage } from "@/lib/chat/pii";
import { getClientIp, isRateLimited } from "@/lib/chat/rate-limit";
import {
  buildStaticSystemSpine,
  buildTurnGroundingBundle,
} from "@/lib/chat/system-prompt";
import {
  CHAT_SESSION_COOKIE_NAME,
  CONSENT_COOKIE_NAME,
  hasPerformanceConsent,
} from "@/lib/consent";
import type { AudienceMode } from "@/lib/corpus/types";

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, seconds
const DEFAULT_CHAT_MODEL = "gpt-5-nano";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseConversationId(body: unknown): string | null {
  const value = (body as { conversationId?: unknown } | null)?.conversationId;
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function parseUuidCookie(raw: string | undefined): string | null {
  return raw && UUID_RE.test(raw) ? raw : null;
}

function parseAudienceMode(body: unknown): AudienceMode {
  const value = (body as { audienceMode?: unknown } | null)?.audienceMode;
  return value === "practitioner" ? "practitioner" : "veteran";
}

function parseDecisionDate(body: unknown): string | null {
  const value = (body as { decisionDate?: unknown } | null)?.decisionDate;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function parseMessages(body: unknown): ChatTurnMessage[] | null {
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return null;
  }

  const raw = (body as { messages: unknown[] }).messages.slice(-MAX_MESSAGES);
  const messages: ChatTurnMessage[] = [];

  for (const entry of raw) {
    if (
      !entry ||
      typeof entry !== "object" ||
      ((entry as { role?: unknown }).role !== "user" &&
        (entry as { role?: unknown }).role !== "assistant") ||
      typeof (entry as { content?: unknown }).content !== "string"
    ) {
      return null;
    }
    const content = (entry as { content: string }).content.slice(
      0,
      MAX_MESSAGE_LENGTH,
    );
    if (content.trim().length === 0) continue;
    messages.push({
      role: (entry as { role: "user" | "assistant" }).role,
      content,
    });
  }

  while (messages.length > 0 && messages[0]?.role !== "user") {
    messages.shift();
  }
  return messages.length > 0 ? messages : null;
}

export async function POST(request: NextRequest) {
  const isVercelBotIdRuntime = Boolean(
    process.env.VERCEL &&
      (process.env.VERCEL_OIDC_TOKEN ||
        request.headers.get("x-vercel-oidc-token")),
  );
  const verification = await checkBotId({
    developmentOptions: { isDevelopment: !isVercelBotIdRuntime },
  });
  if (verification.isBot) {
    return new Response("Access denied.", { status: 403 });
  }

  const ip = getClientIp(request.headers);
  if (isRateLimited(ip)) {
    return new Response(
      "You are sending messages too quickly — please wait a few minutes and try again.",
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const rawMessages = parseMessages(body);
  if (!rawMessages) {
    return new Response("Invalid request.", { status: 400 });
  }

  // Deterministically scrub PII server-side BEFORE any external model call or persistence (ADR-0003)
  const messages = redactMessagesPii(rawMessages);
  const audienceMode = parseAudienceMode(body);
  const activeDecisionDate = parseDecisionDate(body);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      "Research chat is not configured in this environment yet. Use Search (Ctrl/Cmd+K) or Browse (/explore) to inspect primary-source guides directly.",
      { status: 503 },
    );
  }

  const conversationId = parseConversationId(body) ?? crypto.randomUUID();
  const performanceConsent = hasPerformanceConsent(
    request.cookies.get(CONSENT_COOKIE_NAME)?.value,
  );
  const existingSessionCookie = parseUuidCookie(
    request.cookies.get(CHAT_SESSION_COOKIE_NAME)?.value,
  );
  const sessionId = performanceConsent
    ? existingSessionCookie ?? crypto.randomUUID()
    : conversationId;

  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1]?.content ?? "";
  const turnIndex = Math.max(1, userMessages.length);
  const grounding = buildTurnGroundingBundle({
    query: lastUserMessage,
    audienceMode,
    activeDecisionDate,
  });
  const topChunk = grounding.retrieved.chunks[0];
  const topTemporal = grounding.retrieved.temporalResolutions[0];
  const topRoute = topChunk?.href ?? topTemporal?.governingPermalink ?? null;
  const retrievedCount = grounding.retrieved.chunks.length;
  const hasCorpusGap =
    retrievedCount === 0 ||
    grounding.retrieved.temporalResolutions.some(
      (r) =>
        r.doNotRely ||
        r.coverageState === "CORPUS_GAP_OR_QUEUED_WAVE" ||
        r.coverageState === "SUMMARY_ONLY",
    ) ||
    topChunk?.coverageState === "CORPUS_GAP_OR_QUEUED_WAVE" ||
    topChunk?.coverageState === "SUMMARY_ONLY";

  // Pinned to OpenAI `gpt-5-nano` (paid zero-training API tier, ADR-0003);
  // never selectable by client input, only overridable via server `CHAT_MODEL` env var.
  const model = process.env.CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
  const supportsReasoningEffort =
    model.startsWith("gpt-5") || model.startsWith("o");

  const client = new OpenAI({ apiKey });
  const abortController = new AbortController();

  let completionStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    completionStream = await client.chat.completions.create(
      {
        model,
        stream: true,
        store: false,
        max_completion_tokens: 1400,
        prompt_cache_key: "vlg-system-spine-v1",
        ...(supportsReasoningEffort ? { reasoning_effort: "minimal" } : {}),
        messages: [
          {
            role: "system",
            content: buildStaticSystemSpine(),
          },
          {
            role: "system",
            content: grounding.prompt,
          },
          ...messages,
        ],
      },
      { signal: abortController.signal },
    );
  } catch (err) {
    console.error("OpenAI chat stream startup failed:", err);
    return new Response(
      "Unable to reach the research assistant right now. Please try again shortly or use Search (Ctrl/Cmd+K).",
      { status: 502 },
    );
  }

  // Persist ONLY the PII-scrubbed user question (never the AI response) via Next.js after()
  // so Supabase/GA writes never delay streaming or vanish when serverless freezes (ADR-0003).
  after(() =>
    logChatQuestion({
      sessionId,
      conversationId,
      turnIndex,
      audienceMode,
      activeDecisionDate,
      question: lastUserMessage,
      topRoute,
      retrievedCount,
      hasCorpusGap,
    }).catch(() => {}),
  );

  if (performanceConsent) {
    const clientId = resolveClientId(request.cookies.get("_ga")?.value);
    after(() =>
      sendMeasurementProtocolEvent(clientId, {
        name: "chat_message",
        params: {
          conversation_id: conversationId,
          turn_index: turnIndex,
          audience_mode: audienceMode,
        },
      }).catch(() => {}),
    );
  }

  const encoder = new TextEncoder();

  const streamBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  if (performanceConsent) {
    headers.set(
      "Set-Cookie",
      `${CHAT_SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`,
    );
  } else if (request.cookies.has(CHAT_SESSION_COOKIE_NAME)) {
    headers.set(
      "Set-Cookie",
      `${CHAT_SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    );
  }

  return new Response(streamBody, { headers });
}
