"use client";

import { useMemo } from "react";
import type { EnrichedRegistrant } from "./dashboardData";

type StatsBarProps = {
  registrants: EnrichedRegistrant[];
};

export function StatsBar({ registrants }: StatsBarProps) {
  const stats = useMemo(() => [
    { label: "Total Registered", value: registrants.length },
    {
      label: "In Damage Zone",
      value: registrants.filter((registrant) => registrant.damageSeverity !== "none").length,
    },
    {
      label: "Unknown Status",
      value: registrants.filter((registrant) => registrant.contactStatus === "unknown").length,
    },
    {
      label: "Priority 1",
      value: registrants.filter((registrant) => registrant.priorityTier === "P1").length,
    },
  ], [registrants]);
  const statSignature = stats.map((stat) => stat.value).join(":");

  return (
    <dl className="flex items-stretch justify-center">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={[
            "px-5 text-center",
            index === 0 ? "" : "border-l border-[#1e1e1e]",
          ].join(" ")}
        >
          <dt className="font-sans text-[11px] font-medium tracking-[0.1em] text-[#666666] uppercase">
            {stat.label}
          </dt>
          <dd
            key={`${stat.label}-${statSignature}`}
            className="stat-flash font-mono text-[20px] leading-6 font-bold text-[#efefef]"
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
