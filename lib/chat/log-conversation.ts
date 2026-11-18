import { createClient } from "@supabase/supabase-js";
import type { AudienceMode } from "@/lib/corpus/types";
import { redactMessagesPii, type ChatTurnMessage } from "./pii";

export interface LogConversationParams {
  sessionId: string;
  conversationId: string;
  audienceMode: AudienceMode;
  activeDecisionDate: string | null;
  messages: readonly ChatTurnMessage[];
}

function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Persists PII-scrubbed chat transcripts to Supabase (`public.chat_conversations`)
 * keyed on `conversation_id` so multi-turn chats update in place without overwriting
 * prior tabs/sessions (adapted from `WK-private-demo/lib/chat/log-conversation.ts`, ADR-0003).
 *
 * Gracefully no-ops when `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset.
 */
export async function logConversation(
  params: LogConversationParams,
): Promise<void> {
  const client = getSupabaseServiceClient();
  if (!client) return;

  const scrubbedMessages = redactMessagesPii(params.messages);

  const { error } = await client.from("chat_conversations").upsert(
    {
      conversation_id: params.conversationId,
      session_id: params.sessionId,
      audience_mode: params.audienceMode,
      active_decision_date: params.activeDecisionDate,
      messages: scrubbedMessages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id" },
  );

  if (error) {
    console.error("logConversation failed:", error.message);
  }
}
