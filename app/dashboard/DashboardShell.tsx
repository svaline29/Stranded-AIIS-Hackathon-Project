"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DispatchBriefing } from "@/components/dashboard/DispatchBriefing";
import { PriorityList } from "@/components/dashboard/PriorityList";
import { StatsBar } from "@/components/dashboard/StatsBar";
import {
  formatDependencyLabel,
  formatSeverityLabel,
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

export function DashboardShell() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedRegistrantId, setSelectedRegistrantId] = useState<string | null>(null);
  const [disasterModeActive, setDisasterModeActive] = useState(false);

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
            onSelectRegistrant={setSelectedRegistrantId}
          />
          <div className="min-w-0 flex-1">
            <DashboardMapLoader
              damage={loadState.data.damage}
              registrants={loadState.data.registrants}
              selectedRegistrantId={selectedRegistrantId}
              onSelectRegistrant={setSelectedRegistrantId}
            />
          </div>
          {selectedRegistrant !== null ? (
            <RegistrantPanel
              registrant={selectedRegistrant}
              onClose={() => setSelectedRegistrantId(null)}
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function RegistrantPanel({
  registrant,
  onClose,
}: {
  registrant: EnrichedRegistrant;
  onClose: () => void;
}) {
  return (
    <aside className="panel-slide-in h-full w-80 shrink-0 overflow-y-auto border-l border-[#1e1e1e] bg-[#0f0f0f] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Synthetic registrant for demonstration
          </p>
          <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
            {registrant.fullName}
          </h2>
          <p className="font-sans text-xs text-[var(--text-muted)]">
            Age {registrant.age ?? "unknown"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-[3px] border border-[var(--border-default)] bg-transparent px-2.5 py-1 font-mono text-[11px] text-[var(--text-primary)] transition-[border-color] duration-100 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      <dl className="mb-5 space-y-0 text-sm">
        <div className="border-t border-[var(--border-subtle)] py-4">
          <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Address
          </dt>
          <dd className="mt-2 font-sans text-sm text-[var(--text-primary)]">{registrant.address}</dd>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-4">
          <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Dependencies
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2">
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
        <div className="border-t border-[var(--border-subtle)] py-4">
          <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Damage severity
          </dt>
          <dd className="mt-2">
            <Badge
              variant="outline"
              className="rounded-[3px] border bg-transparent px-2 py-0.5 font-mono text-[10px] font-normal uppercase"
              style={getSeverityStyles(registrant.damageSeverity)}
            >
              {formatSeverityLabel(registrant.damageSeverity)}
            </Badge>
          </dd>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-4">
          <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Risk score
          </dt>
          <dd className="mt-1 font-mono text-[22px] leading-7 font-semibold text-[var(--text-primary)]">
            {registrant.riskScore.toFixed(1)}
          </dd>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-4">
          <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Contact status
          </dt>
          <dd className="mt-2">
            <Badge
              variant="outline"
              className="rounded-[3px] border border-[#282828] bg-[#161616] px-2 py-0.5 font-mono text-[10px] font-normal text-[#999999] uppercase"
            >
              {formatStatusLabel(registrant.contactStatus)}
            </Badge>
          </dd>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-4">
          <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Primary language
          </dt>
          <dd className="mt-1 font-sans text-sm text-[var(--text-primary)]">
            {registrant.primaryLanguage}
          </dd>
        </div>
        {registrant.caregiverPhone !== null ? (
          <div className="border-t border-[var(--border-subtle)] py-4">
            <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
              Caregiver phone
            </dt>
            <dd className="mt-1 font-sans text-sm text-[var(--text-primary)]">
              {registrant.caregiverPhone}
            </dd>
          </div>
        ) : null}
      </dl>

      <DispatchBriefing registrant={registrant} />
    </aside>
  );
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
