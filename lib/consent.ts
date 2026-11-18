export const CONSENT_COOKIE_NAME = "vlg_consent";
export const CHAT_SESSION_COOKIE_NAME = "vlg_chat_session";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 days, seconds

export interface ConsentPreferences {
  performance: boolean;
}

export interface StoredConsent extends ConsentPreferences {
  version: typeof CONSENT_VERSION;
  decidedAt: string;
}

export const NECESSARY_ONLY: ConsentPreferences = {
  performance: false,
};

export function serializeStoredConsent(preferences: ConsentPreferences): string {
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    performance: Boolean(preferences.performance),
  };
  return encodeURIComponent(JSON.stringify(stored));
}

export function parseStoredConsent(
  raw: string | undefined | null,
): StoredConsent | null {
  if (!raw) return null;
  try {
    const stored = JSON.parse(
      decodeURIComponent(raw),
    ) as Partial<StoredConsent>;
    if (
      stored.version !== CONSENT_VERSION ||
      typeof stored.performance !== "boolean" ||
      typeof stored.decidedAt !== "string"
    ) {
      return null;
    }
    return {
      version: CONSENT_VERSION,
      performance: stored.performance,
      decidedAt: stored.decidedAt,
    };
  } catch {
    return null;
  }
}

export function hasPerformanceConsent(raw: string | undefined | null): boolean {
  return parseStoredConsent(raw)?.performance === true;
}
