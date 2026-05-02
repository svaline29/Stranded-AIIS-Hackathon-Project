import { Badge } from "@/components/ui/badge";
import type { EnrichedRegistrant } from "./dashboardData";
import { formatDependencyLabel } from "./dashboardData";

type DispatchBriefingProps = {
  registrant: EnrichedRegistrant;
};

export function DispatchBriefing({ registrant }: DispatchBriefingProps) {
  const primaryDependency =
    registrant.primaryDependency === null
      ? "no listed primary dependency"
      : formatDependencyLabel(registrant.primaryDependency).toLowerCase();
  const age = registrant.age === null ? "age unknown" : String(registrant.age);
  const timeClause =
    registrant.hoursSinceContact === null
      ? "No prior contact on record."
      : `Last contact ${Math.round(registrant.hoursSinceContact)} hours ago.`;
  const resourceText =
    registrant.resourceTags.length > 0 ? registrant.resourceTags.join(", ") : "welfare_check";
  const briefing = `Priority ${registrant.priorityTier}: ${registrant.fullName}, ${age}, ${primaryDependency}. Building shows ${registrant.damageSeverity} damage. ${timeClause} Dispatch: ${resourceText}.`;
  const severityColor = getSeverityColor(registrant.damageSeverity);

  return (
    <section className="border-t border-[var(--border-subtle)] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Dispatch Briefing
        </h3>
        <Badge
          variant="outline"
          className="rounded-[3px] border bg-transparent px-2 py-0.5 font-mono text-[10px] font-normal"
          style={{ borderColor: severityColor, color: severityColor }}
        >
          {registrant.priorityTier}
        </Badge>
      </div>
      <p
        className="border-l-[3px] bg-[var(--bg-elevated)] py-3 pr-4 pl-4 font-mono text-xs leading-[1.6] text-[var(--text-secondary)]"
        style={{ borderLeftColor: severityColor }}
      >
        {briefing}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(registrant.resourceTags.length > 0 ? registrant.resourceTags : ["welfare_check"]).map(
          (tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="rounded-[3px] border border-[#282828] bg-[#161616] px-2 py-0.5 font-mono text-[10px] font-normal text-[#999999]"
            >
              {tag}
            </Badge>
          ),
        )}
      </div>
    </section>
  );
}

function getSeverityColor(severity: EnrichedRegistrant["damageSeverity"]): string {
  if (severity === "destroyed") {
    return "#ef4444";
  }
  if (severity === "major") {
    return "#f97316";
  }
  if (severity === "minor") {
    return "#eab308";
  }
  return "#404040";
}
