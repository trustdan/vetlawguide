import { createClient } from "@supabase/supabase-js";
import type { AudienceMode } from "@/lib/corpus/types";
import { redactPii } from "./pii";

export interface LogChatQuestionParams {
  sessionId: string;
  conversationId: string;
  turnIndex: number;
  audienceMode: AudienceMode;
  activeDecisionDate: string | null;
  question: string;
  topRoute?: string | null;
  retrievedCount?: number;
  hasCorpusGap?: boolean;
}

export interface ChatQuestionCoreInsertRow {
  conversation_id: string;
  session_id: string;
  turn_index: number;
  audience_mode: AudienceMode;
  active_decision_date: string | null;
  question: string;
}

export interface ChatQuestionInsertRow extends ChatQuestionCoreInsertRow {
  top_route?: string | null;
  retrieved_count?: number;
  has_corpus_gap?: boolean;
}

export interface ChatQuestionsTableWriter {
  insert(
    row: ChatQuestionInsertRow,
  ): PromiseLike<{ error: { code?: string; message: string } | null }>;
}

function getSupabaseQuestionsWriter(): ChatQuestionsTableWriter | null {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !key) {
    return null;
  }
  const normalizedUrl = rawUrl
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
  const client = createClient(normalizedUrl, key, {
    auth: { persistSession: false },
  });
  return client.from("chat_questions");
}

function isMissingOptionalColumnError(error: {
  code?: string;
  message: string;
}): boolean {
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /top_route|retrieved_count|has_corpus_gap|schema cache|column/i.test(
      error.message,
    )
  );
}

/**
 * Appends a single PII-scrubbed user question row to Supabase (`public.chat_questions`).
 * Assistant responses are intentionally never persisted (ADR-0003).
 *
 * Automatically falls back to the 6 core columns if optional retrieval columns
 * (`top_route`, `retrieved_count`, `has_corpus_gap`) have not been added yet,
 * and gracefully no-ops when `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset.
 */
export async function logChatQuestion(
  params: LogChatQuestionParams,
  writerOverride?: ChatQuestionsTableWriter | null,
): Promise<void> {
  const writer =
    writerOverride !== undefined ? writerOverride : getSupabaseQuestionsWriter();
  if (!writer) return;

  const scrubbedQuestion = redactPii(params.question).trim();
  if (!scrubbedQuestion) return;

  const turnIndex = Math.max(1, Math.trunc(params.turnIndex || 1));
  const retrievedCount = Math.max(0, Math.trunc(params.retrievedCount ?? 0));

  const coreRow: ChatQuestionCoreInsertRow = {
    conversation_id: params.conversationId,
    session_id: params.sessionId,
    turn_index: turnIndex,
    audience_mode: params.audienceMode,
    active_decision_date: params.activeDecisionDate,
    question: scrubbedQuestion,
  };

  const fullRow: ChatQuestionInsertRow = {
    ...coreRow,
    top_route: params.topRoute ?? null,
    retrieved_count: retrievedCount,
    has_corpus_gap: Boolean(params.hasCorpusGap),
  };

  const { error } = await writer.insert(fullRow);
  if (!error) return;

  if (isMissingOptionalColumnError(error)) {
    const retry = await writer.insert(coreRow);
    if (!retry.error) return;
    console.error("logChatQuestion fallback insert failed:", retry.error.message);
    return;
  }

  console.error("logChatQuestion failed:", error.message);
}
