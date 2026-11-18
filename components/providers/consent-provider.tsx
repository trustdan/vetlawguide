"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  CHAT_SESSION_COOKIE_NAME,
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  NECESSARY_ONLY,
  parseStoredConsent,
  serializeStoredConsent,
  type ConsentPreferences,
} from "@/lib/consent";

interface ConsentContextValue {
  preferences: ConsentPreferences | null;
  performanceAllowed: boolean;
  openSettings: () => void;
  savePreferences: (next: ConsentPreferences) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);
const subscribeToHydration = () => () => {};

function readStoredConsentFromDocument(): ConsentPreferences | null {
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  const raw = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);

  const parsed = parseStoredConsent(raw);
  if (!parsed) return null;
  return { performance: parsed.performance };
}

function writeStoredConsentToDocument(preferences: ConsentPreferences): void {
  const encoded = serializeStoredConsent(preferences);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
}

export function deleteGoogleAnalyticsCookies(): void {
  const names = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0] ?? "")
    .filter(
      (name) =>
        name === "_ga" ||
        name === "_gid" ||
        name.startsWith("_ga_") ||
        name === CHAT_SESSION_COOKIE_NAME,
    );

  const hostname = window.location.hostname;
  const hostParts = hostname.split(".");
  const domains = new Set<string | undefined>([
    undefined,
    hostname,
    `.${hostname}`,
  ]);

  if (hostParts.length >= 2 && hostname !== "localhost" && hostname !== "127.0.0.1") {
    const registrable = hostParts.slice(-2).join(".");
    domains.add(registrable);
    domains.add(`.${registrable}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      const domainAttr = domain ? `; Domain=${domain}` : "";
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domainAttr}`;
    }
  }
}

export function syncGoogleConsentMode(
  performanceAllowed: boolean,
  isInvestigateRoute: boolean,
): void {
  const grantAnalytics = performanceAllowed && !isInvestigateRoute;
  window.gtag?.("consent", "update", {
    analytics_storage: grantAnalytics ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInvestigateRoute = pathname?.startsWith("/investigate") ?? false;

  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const initialStored = useMemo(
    () => (hydrated ? readStoredConsentFromDocument() : null),
    [hydrated],
  );

  const [overridePreferences, setOverridePreferences] =
    useState<ConsentPreferences | null>(null);
  const preferences = overridePreferences ?? initialStored;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPerformance, setDraftPerformance] = useState(false);
  const closeDialogBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    const allowed = preferences?.performance === true;
    syncGoogleConsentMode(allowed, isInvestigateRoute);
    if (!allowed || isInvestigateRoute) {
      deleteGoogleAnalyticsCookies();
    }
  }, [hydrated, preferences?.performance, isInvestigateRoute]);

  useEffect(() => {
    if (!settingsOpen) return;
    const timer = requestAnimationFrame(() => {
      closeDialogBtnRef.current?.focus();
    });
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSettingsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  const savePreferences = useCallback(
    (next: ConsentPreferences) => {
      writeStoredConsentToDocument(next);
      setOverridePreferences(next);
      setDraftPerformance(next.performance);
      setSettingsOpen(false);
      syncGoogleConsentMode(next.performance, isInvestigateRoute);
      if (!next.performance) {
        deleteGoogleAnalyticsCookies();
      }
    },
    [isInvestigateRoute],
  );

  const openSettings = useCallback(() => {
    setDraftPerformance(preferences?.performance ?? false);
    setSettingsOpen(true);
  }, [preferences?.performance]);

  const contextValue = useMemo<ConsentContextValue>(
    () => ({
      preferences,
      performanceAllowed: preferences?.performance === true && !isInvestigateRoute,
      openSettings,
      savePreferences,
    }),
    [preferences, isInvestigateRoute, openSettings, savePreferences],
  );

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}

      {/* Calm first-visit consent bar (suppressed on air-gapped /investigate) */}
      {hydrated && !isInvestigateRoute && preferences === null && !settingsOpen && (
        <section
          aria-label="Cookie choices"
          data-testid="consent-banner"
          className="no-print fixed inset-x-3 bottom-16 z-30 rounded-lg border border-border bg-surface-elevated p-3.5 text-foreground shadow-xl sm:right-auto sm:bottom-6 sm:left-6 sm:max-w-md"
        >
          <div className="space-y-2.5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">
                Privacy choices:
              </strong>{" "}
              Necessary storage remembers your reading mode and theme. Optional
              analytics measure public page usage (never active on Investigate).{" "}
              <Link
                href="/privacy"
                prefetch={false}
                className="font-medium text-primary underline underline-offset-2"
              >
                Privacy notice
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="consent-necessary-only"
                onClick={() => savePreferences(NECESSARY_ONLY)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                Necessary only
              </button>
              <button
                type="button"
                data-testid="consent-customize"
                onClick={openSettings}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                Customize
              </button>
              <button
                type="button"
                data-testid="consent-accept-all"
                onClick={() => savePreferences({ performance: true })}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Accept analytics
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Accessible Cookie & Analytics Settings Dialog */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vlg-consent-dialog-title"
          data-testid="consent-settings-dialog"
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface-elevated p-5 text-foreground shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3.5">
              <div>
                <h2
                  id="vlg-consent-dialog-title"
                  className="font-serif text-xl font-bold"
                >
                  Privacy &amp; Cookie Settings
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Control optional analytics cookies. Investigate answers always
                  stay in browser memory with analytics disabled.
                </p>
              </div>
              <button
                ref={closeDialogBtnRef}
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close privacy settings"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface p-3.5">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Necessary Preferences
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Stores your Veterans/Practitioners reading toggle, light/dark
                    theme, and this cookie preference. Always active.
                  </p>
                </div>
                <span className="shrink-0 rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  Required
                </span>
              </div>

              <label
                htmlFor="vlg-consent-performance-toggle"
                className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-border bg-surface p-3.5"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Performance &amp; Usage Analytics
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Allows Google Analytics (<code className="font-mono">GTM-W9T68MCQ</code>)
                    pathname-only page views on public pages and anonymous chat
                    session continuity. Never runs on{" "}
                    <code className="font-mono">/investigate</code>.
                  </p>
                </div>
                <input
                  id="vlg-consent-performance-toggle"
                  type="checkbox"
                  checked={draftPerformance}
                  onChange={(e) => setDraftPerformance(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => savePreferences(NECESSARY_ONLY)}
                className="rounded-md border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                Necessary only
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => savePreferences({ performance: draftPerformance })}
                  className="rounded-md border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Save choices
                </button>
                <button
                  type="button"
                  onClick={() => savePreferences({ performance: true })}
                  className="rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Accept analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within <ConsentProvider>.");
  }
  return ctx;
}

export function CookieSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useConsent();
  return (
    <button
      type="button"
      data-testid="cookie-settings-trigger"
      onClick={openSettings}
      className={
        className ??
        "underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      }
    >
      Cookie settings
    </button>
  );
}
