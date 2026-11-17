"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getHistoricalEraById,
  resolveEraIdForDate,
} from "@/lib/corpus/eras-and-authorities";
import type { AudienceMode, HistoricalEraId } from "@/lib/corpus/types";

const MODE_CHANGE_EVENT = "vlg:audience-mode-change";

function subscribeAudienceMode(onStoreChange: () => void): () => void {
  window.addEventListener(MODE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(MODE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getClientAudienceMode(): AudienceMode {
  const mode = document.documentElement.dataset.mode;
  return mode === "practitioner" ? "practitioner" : "veteran";
}

function getServerAudienceMode(): AudienceMode {
  return "veteran";
}

interface ResearchContextValue {
  audienceMode: AudienceMode;
  setAudienceMode: (mode: AudienceMode) => void;
  decisionDate: string | null;
  setDecisionDate: (isoDate: string | null) => void;
  activeEraId: HistoricalEraId | null;
  selectEra: (eraId: HistoricalEraId | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openSearchWithQuery: (q: string) => void;
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const audienceMode = useSyncExternalStore(
    subscribeAudienceMode,
    getClientAudienceMode,
    getServerAudienceMode,
  );
  const [decisionDate, setDecisionDateState] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const setAudienceMode = useCallback((mode: AudienceMode) => {
    document.documentElement.dataset.mode = mode;
    try {
      window.localStorage.setItem("vlg_audience_mode", mode);
    } catch {
      // Ignore storage blocks in strict private browsing
    }
    window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
  }, []);

  const setDecisionDate = useCallback((isoDate: string | null) => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      setDecisionDateState(null);
      return;
    }
    setDecisionDateState(isoDate);
  }, []);

  const activeEraId = useMemo(
    () => resolveEraIdForDate(decisionDate),
    [decisionDate],
  );

  const selectEra = useCallback((eraId: HistoricalEraId | null) => {
    if (!eraId) {
      setDecisionDateState(null);
      return;
    }
    const eraSpec = getHistoricalEraById(eraId);
    if (!eraSpec) {
      setDecisionDateState(null);
      return;
    }
    setDecisionDateState((prev) => {
      const prevEra = resolveEraIdForDate(prev);
      return prevEra === eraId ? null : eraSpec.representativeDate;
    });
  }, []);

  const openSearchWithQuery = useCallback((q: string) => {
    setSearchQuery(q);
    setSearchOpen(true);
  }, []);

  const value = useMemo<ResearchContextValue>(
    () => ({
      audienceMode,
      setAudienceMode,
      decisionDate,
      setDecisionDate,
      activeEraId,
      selectEra,
      searchOpen,
      setSearchOpen,
      searchQuery,
      setSearchQuery,
      openSearchWithQuery,
    }),
    [
      audienceMode,
      setAudienceMode,
      decisionDate,
      setDecisionDate,
      activeEraId,
      selectEra,
      searchOpen,
      searchQuery,
      openSearchWithQuery,
    ],
  );

  return (
    <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>
  );
}

export function useResearchContext(): ResearchContextValue {
  const ctx = useContext(ResearchContext);
  if (!ctx) {
    throw new Error("useResearchContext must be used inside <ResearchProvider>.");
  }
  return ctx;
}
