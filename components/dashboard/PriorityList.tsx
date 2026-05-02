"use client";

import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EnrichedRegistrant } from "./dashboardData";
import { formatDependencyLabel, formatSeverityLabel } from "./dashboardData";

type PriorityListProps = {
  registrants: EnrichedRegistrant[];
  selectedRegistrantId: string | null;
  onSelectRegistrant: (registrantId: string) => void;
};

export function PriorityList({
  registrants,
  selectedRegistrantId,
  onSelectRegistrant,
}: PriorityListProps) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-[#1e1e1e] bg-[#0f0f0f]">
      <div className="px-5 pt-4 pb-2">
        <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Priority List
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ol>
          {registrants.map((registrant, index) => {
            const isSelected = registrant.id === selectedRegistrantId;
            const hasThreat = registrant.riskScore > 0;
            const severityStyles = getSeverityStyles(registrant.damageSeverity);

            return (
              <li
                key={registrant.id}
                className={[
                  "border-b border-[#1e1e1e] px-5 py-4 transition-colors duration-150 ease-in-out",
                  isSelected
                    ? "bg-[var(--bg-hover)]"
                    : "bg-[#0f0f0f] hover:bg-[var(--bg-hover)]",
                  hasThreat ? "" : "opacity-55",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-5 shrink-0 pt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={[
                            "truncate font-sans text-sm font-medium text-[var(--text-primary)]",
                            hasThreat ? "" : "italic text-[var(--text-muted)]",
                          ].join(" ")}
                        >
                          {registrant.fullName}
                          <span className="ml-1 font-normal text-[var(--text-muted)]">
                            · {registrant.age ?? "unknown"}
                          </span>
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-[3px] border bg-transparent px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase"
                        style={severityStyles}
                      >
                        {formatSeverityLabel(registrant.damageSeverity)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {registrant.primaryDependency === null ? (
                        <Badge
                          variant="outline"
                          className="rounded-[3px] border border-[#282828] bg-[#161616] px-2 py-0.5 font-mono text-[10px] font-normal text-[#999999]"
                        >
                          No dependency listed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-[3px] border border-[#282828] bg-[#161616] px-2 py-0.5 font-mono text-[10px] font-normal text-[#999999]"
                        >
                          {formatDependencyLabel(registrant.primaryDependency)}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        {hasThreat ? (
                          <>
                            <p className="font-sans text-xs text-[var(--text-muted)]">
                              Risk score
                            </p>
                            <p className="font-mono text-[18px] leading-6 font-semibold text-[var(--text-primary)]">
                              {registrant.riskScore.toFixed(1)}
                            </p>
                          </>
                        ) : (
                          <p className="max-w-36 font-sans text-xs font-normal text-[var(--text-muted)] italic">
                            No current threat detected
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={[
                          "rounded-[3px] border border-[var(--border-default)] bg-transparent px-2.5 py-1 font-mono text-[11px] font-normal text-[var(--text-primary)] transition-[border-color,background-color] duration-100 ease-in-out hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                          isSelected ? "border-[var(--accent)] text-[var(--accent)]" : "",
                        ].join(" ")}
                        onClick={() => onSelectRegistrant(registrant.id)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

function getSeverityStyles(
  severity: EnrichedRegistrant["damageSeverity"],
): CSSProperties {
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
