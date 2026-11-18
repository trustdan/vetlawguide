export interface ChatTurnMessage {
  role: "user" | "assistant";
  content: string;
}

const DASHED_SSN_RE = /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;
const CONTEXTUAL_SSN_RE =
  /\b(?:ssn|social\s+security(?:\s*(?:no\.?|number|#))?)\s*[:=#-]?\s*\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/gi;
const VA_CLAIM_FILE_RE =
  /\b(?:(?:va\s*)?(?:file|claim)\s*(?:no\.?|number|#)\s*[:=#-]?\s*c?[-\s]?\d{7,9}|c-\d{7,9})\b/gi;
const SERVICE_OR_EDIPI_RE =
  /\b(?:edipi|dod\s*id|service\s*(?:no\.?|number|#))\s*[:=#-]?\s*\d{8,10}\b/gi;
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const US_PHONE_RE =
  /(?:(?:\+?1[-.\s]?)?\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}|\b(?:\+?1[-.\s])?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/g;

/**
 * Client-side pre-send PII firewall (ADR-0003 & Rule 05):
 * Blocks obvious Social Security Numbers, VA claim/file numbers, and DoD ID / service
 * numbers BEFORE `fetch("/api/chat")` fires, while never false-positiving on 4-digit
 * VASRD Diagnostic Codes (`7399-7346`), VA Form numbers (`21-4138`, `10-7131`),
 * Federal Register citations (`62 FR 30235`), Public Laws (`Pub. L. 100-687`), or ISO dates.
 */
export function detectBlockingClientPii(text: string): string | null {
  DASHED_SSN_RE.lastIndex = 0;
  CONTEXTUAL_SSN_RE.lastIndex = 0;
  if (DASHED_SSN_RE.test(text) || CONTEXTUAL_SSN_RE.test(text)) {
    return "Please remove Social Security Numbers before sending. Ask general questions using Diagnostic Codes, 38 C.F.R. citations, or decision years instead.";
  }

  VA_CLAIM_FILE_RE.lastIndex = 0;
  SERVICE_OR_EDIPI_RE.lastIndex = 0;
  if (VA_CLAIM_FILE_RE.test(text) || SERVICE_OR_EDIPI_RE.test(text)) {
    return "Please remove VA claim/file numbers and military ID numbers before sending. Never enter identifying claim details in chat.";
  }

  return null;
}

/**
 * Deterministic server-side PII scrubber applied before LLM invocation
 * and before any `chat_questions` persistence (ADR-0003).
 */
export function redactPii(text: string): string {
  return text
    .replace(CONTEXTUAL_SSN_RE, "[REDACTED-SSN]")
    .replace(DASHED_SSN_RE, "[REDACTED-SSN]")
    .replace(VA_CLAIM_FILE_RE, "[REDACTED-VA-FILE]")
    .replace(SERVICE_OR_EDIPI_RE, "[REDACTED-SERVICE-ID]")
    .replace(EMAIL_RE, "[REDACTED-EMAIL]")
    .replace(US_PHONE_RE, "[REDACTED-PHONE]");
}

export function redactMessagesPii(messages: readonly ChatTurnMessage[]): ChatTurnMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: redactPii(msg.content),
  }));
}
