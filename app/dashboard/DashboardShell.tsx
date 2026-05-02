"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DispatchBriefing } from "@/components/dashboard/DispatchBriefing";
import { PriorityList } from "@/components/dashboard/PriorityList";
import { StatsBar } from "@/components/dashboard/StatsBar";
import type { TriageBriefingResult, TriageBriefingState } from "@/components/dashboard/triageTypes";
import {
  formatDependencyLabel,
  formatSeverityLabel,
  getPriorityTier,
  loadDashboardData,
  type DashboardData,
  type EnrichedRegistrant,
} from "@/components/dashboard/dashboardData";
import { DashboardMapLoader } from "./DashboardMapLoader";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData }
  | { status: "error"; message: string };

const EMPTY_ENRICHED_REGISTRANTS: EnrichedRegistrant[] = [];
const TRIAGE_CACHE_TTL_MS = 10 * 60 * 1000;

export function DashboardShell() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedRegistrantId, setSelectedRegistrantId] = useState<string | null>(null);
  const [disasterModeActive, setDisasterModeActive] = useState(false);
  const [triageByRegistrantId, setTriageByRegistrantId] = useState<
    Record<string, TriageBriefingState>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const data = await loadDashboardData();

        if (!cancelled) {
          setLoadState({ status: "ready", data });
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: caught instanceof Error ? caught.message : "Unable to load dashboard data",
          });
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const enrichedRegistrants =
    loadState.status === "ready" ? loadState.data.enrichedRegistrants : EMPTY_ENRICHED_REGISTRANTS;
  const selectedRegistrant = useMemo(
    () =>
      enrichedRegistrants.find((registrant) => registrant.id === selectedRegistrantId) ?? null,
    [enrichedRegistrants, selectedRegistrantId],
  );
  const selectedTriageState = getVisibleTriageState(
    selectedRegistrant,
    selectedRegistrantId === null ? undefined : triageByRegistrantId[selectedRegistrantId],
  );

  const loadTriageBriefing = useCallback(async (registrantId: string) => {
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrantId }),
      });

      if (!response.ok) {
        throw new Error("Unable to generate triage briefing");
      }

      const result = (await response.json()) as TriageBriefingResult;
      setTriageByRegistrantId((current) => {
        return {
          ...current,
          [registrantId]: { status: "ready", result },
        };
      });
    } catch (caught) {
      setTriageByRegistrantId((current) => ({
        ...current,
        [registrantId]: {
          status: "error",
          message: caught instanceof Error ? caught.message : "Unable to generate triage briefing",
        },
      }));
    }
  }, []);

  const requestTriageBriefing = useCallback(
    (registrantId: string, options?: { forceClientRefresh?: boolean }) => {
      const currentState = triageByRegistrantId[registrantId];
      if (currentState?.status === "loading") {
        return;
      }
      if (
        options?.forceClientRefresh !== true &&
        currentState?.status === "ready" &&
        Date.now() - currentState.result.generatedAt < TRIAGE_CACHE_TTL_MS
      ) {
        return;
      }

      setTriageByRegistrantId((current) => ({
        ...current,
        [registrantId]: { status: "loading", showEstimate: true },
      }));

      window.setTimeout(() => {
        setTriageByRegistrantId((current) => {
          const latest = current[registrantId];

          if (latest?.status !== "loading") {
            return current;
          }

          return {
            ...current,
            [registrantId]: { status: "loading", showEstimate: false },
          };
        });
      }, 2200);

      void loadTriageBriefing(registrantId);
    },
    [loadTriageBriefing, triageByRegistrantId],
  );

  useEffect(() => {
    if (
      selectedRegistrant === null ||
      (selectedRegistrant.priorityTier !== "P1" && selectedRegistrant.priorityTier !== "P2")
    ) {
      return;
    }

    requestTriageBriefing(selectedRegistrant.id);
  }, [requestTriageBriefing, selectedRegistrant]);

  function handleSelectRegistrant(registrantId: string) {
    setSelectedRegistrantId(registrantId);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <nav className="grid h-16 shrink-0 grid-cols-[320px_1fr_320px] items-center border-b border-[#1e1e1e] bg-[#0f0f0f] px-6">
        <div>
          <div>
            <span
              className="mr-2 inline-block size-1.5 bg-[#e87c2e] align-middle"
              aria-hidden="true"
            />
            <p className="inline font-mono text-[15px] font-semibold tracking-widest text-[#f0f0f0] uppercase align-middle">
              Stranded
            </p>
          </div>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
            Synthetic registrants for demonstration
          </p>
        </div>
        <StatsBar registrants={enrichedRegistrants} />
        <button
          type="button"
          className={[
            "justify-self-end rounded-[999px] border px-4 py-2 font-mono text-[11px] tracking-wide uppercase transition-colors",
            disasterModeActive
              ? "disaster-pulse border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
              : "border-[var(--border-default)] bg-transparent text-[var(--text-muted)]",
          ].join(" ")}
          onClick={() => setDisasterModeActive((current) => !current)}
        >
          Disaster Mode: {disasterModeActive ? "ON" : "OFF"}
        </button>
      </nav>

      {loadState.status === "loading" ? (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center font-mono text-xs text-[var(--text-secondary)]">
          Loading ranked registrants and damage polygons...
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center p-6">
          <div className="rounded-[4px] border border-red-500/70 bg-[var(--bg-elevated)] p-4 font-mono text-sm text-red-300">
            {loadState.message}
          </div>
        </div>
      ) : null}

      {loadState.status === "ready" ? (
        <section className="flex h-[calc(100vh-64px)] min-h-0 w-full">
          <PriorityList
            registrants={enrichedRegistrants}
            selectedRegistrantId={selectedRegistrantId}
            onSelectRegistrant={handleSelectRegistrant}
          />
          <div className="min-w-0 flex-1">
            <DashboardMapLoader
              damage={loadState.data.damage}
              registrants={loadState.data.registrants}
              selectedRegistrantId={selectedRegistrantId}
              onSelectRegistrant={handleSelectRegistrant}
            />
          </div>
          {selectedRegistrant !== null ? (
            <RegistrantPanel
              registrant={selectedRegistrant}
              triageState={selectedTriageState}
              onGenerateBriefing={() => requestTriageBriefing(selectedRegistrant.id)}
              onRegenerateBriefing={() =>
                requestTriageBriefing(selectedRegistrant.id, { forceClientRefresh: true })
              }
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function RegistrantPanel({
  registrant,
  triageState,
  onGenerateBriefing,
  onRegenerateBriefing,
}: {
  registrant: EnrichedRegistrant;
  triageState: TriageBriefingState;
  onGenerateBriefing: () => void;
  onRegenerateBriefing: () => void;
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (panelRef.current !== null) {
      panelRef.current.scrollTop = 0;
    }
    setDetailsExpanded(false);
  }, [registrant.id]);

  return (
    <aside
      ref={panelRef}
      className="panel-slide-in h-full w-80 shrink-0 overflow-y-auto border-l border-[#1e1e1e] bg-[#0f0f0f] p-5"
    >
      <div className="mb-5 border-b border-[var(--border-subtle)] pb-3">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="min-w-0 font-sans text-[18px] font-semibold text-[var(--text-primary)]">
            {registrant.fullName}
            <span className="ml-1 font-normal text-[var(--text-muted)]">
              · {registrant.age ?? "unknown"}
            </span>
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-[3px] border bg-transparent px-2 py-0.5 font-mono text-[10px] font-normal uppercase"
              style={getSeverityStyles(registrant.damageSeverity)}
            >
              {formatSeverityLabel(registrant.damageSeverity)}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-[3px] border bg-transparent px-2 py-0.5 font-mono text-[10px] font-normal"
              style={getPriorityStyles(registrant.priorityTier)}
            >
              {registrant.priorityTier}
            </Badge>
          </div>
        </div>
        <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Synthetic registrant for demonstration
        </p>
      </div>

      <DispatchBriefing
        registrant={registrant}
        triageState={triageState}
      />

      <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
        <button
          type="button"
          className="font-mono text-[11px] text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-secondary)]"
          onClick={() => setDetailsExpanded((current) => !current)}
        >
          Registrant Details {detailsExpanded ? "▾" : "▸"}
        </button>
        <div
          className={[
            "overflow-hidden transition-[max-height] duration-200 ease-in-out",
            detailsExpanded ? "max-h-[520px]" : "max-h-0",
          ].join(" ")}
        >
          <dl className="mt-3 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <DetailRow label="Address" value={registrant.address} />
            <DetailRow label="Phone" value={registrant.contactPhone} />
            <div>
              <dt className="text-[var(--text-muted)]">Dependencies</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {registrant.dependencies.map((dependency) => (
                  <Badge
                    key={dependency}
                    variant="outline"
                    className="rounded-[3px] border border-[#282828] bg-[#161616] px-2 py-0.5 font-mono text-[10px] font-normal text-[#999999]"
                  >
                    {formatDependencyLabel(dependency)}
                  </Badge>
                ))}
              </dd>
            </div>
            <DetailRow label="Language" value={registrant.primaryLanguage} />
            {registrant.caregiverPhone !== null ? (
              <DetailRow label="Caregiver phone" value={registrant.caregiverPhone} />
            ) : null}
            <DetailRow label="Registered via" value={formatStatusLabel(registrant.registeredVia)} />
          </dl>
        </div>
      </div>

      {triageState.status !== "ready" && triageState.status !== "loading" ? (
        <button
          type="button"
          className="mt-5 w-full rounded-[3px] border border-[var(--accent)] bg-[var(--accent-dim)] px-3 py-2.5 font-mono text-xs tracking-wide text-[var(--accent)] uppercase transition-colors hover:bg-[rgba(232,124,46,0.18)]"
          onClick={onGenerateBriefing}
        >
          Generate Briefing
        </button>
      ) : null}

      {triageState.status === "ready" ? (
        <button
          type="button"
          className="mt-5 font-mono text-[10px] tracking-wide text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-secondary)]"
          onClick={onRegenerateBriefing}
        >
          Regenerate
        </button>
      ) : null}

    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--text-secondary)]">{value}</dd>
    </div>
  );
}

function getVisibleTriageState(
  registrant: EnrichedRegistrant | null,
  cachedState: TriageBriefingState | undefined,
): TriageBriefingState {
  if (registrant === null) {
    return { status: "idle" };
  }

  const derivedPriorityTier = getPriorityTier(registrant.riskScore);
  const existingBriefing =
    cachedState?.status === "ready" &&
    Date.now() - cachedState.result.generatedAt < TRIAGE_CACHE_TTL_MS;

  if (existingBriefing || cachedState?.status === "loading" || cachedState?.status === "error") {
    return cachedState;
  }

  if (derivedPriorityTier === "P1" || derivedPriorityTier === "P2") {
    return { status: "loading", showEstimate: true };
  }

  return cachedState ?? { status: "idle" };
}

function formatStatusLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSeverityStyles(severity: EnrichedRegistrant["damageSeverity"]) {
  if (severity === "destroyed") {
    return {
      borderColor: "rgba(239, 68, 68, 0.5)",
      color: "#ef4444",
      textShadow: "0 0 8px rgba(239, 68, 68, 0.3)",
    };
  }
  if (severity === "major") {
    return {
      borderColor: "rgba(249, 115, 22, 0.5)",
      color: "#f97316",
      textShadow: "0 0 8px rgba(249, 115, 22, 0.2)",
    };
  }
  if (severity === "minor") {
    return {
      borderColor: "rgba(234, 179, 8, 0.5)",
      color: "#eab308",
      textShadow: "0 0 6px rgba(234, 179, 8, 0.15)",
    };
  }
  return {
    borderColor: "rgba(64, 64, 64, 0.6)",
    color: "#404040",
  };
}

function getPriorityStyles(priorityTier: EnrichedRegistrant["priorityTier"]) {
  if (priorityTier === "P1") {
    return {
      borderColor: "rgba(232, 124, 46, 0.8)",
      color: "var(--accent)",
      textShadow: "0 0 8px rgba(232, 124, 46, 0.3)",
    };
  }
  if (priorityTier === "P2") {
    return { borderColor: "rgba(249, 115, 22, 0.6)", color: "#f97316" };
  }
  if (priorityTier === "P3") {
    return { borderColor: "rgba(234, 179, 8, 0.6)", color: "#eab308" };
  }
  return { borderColor: "rgba(64, 64, 64, 0.7)", color: "#777777" };
}
