import { Badge } from "@/components/ui/badge";
import type { EnrichedRegistrant } from "./dashboardData";
import type { TriageBriefingState } from "./triageTypes";

type DispatchBriefingProps = {
  registrant: EnrichedRegistrant;
  triageState: TriageBriefingState;
};

export function DispatchBriefing({ registrant, triageState }: DispatchBriefingProps) {
  const severityColor = getSeverityColor(registrant.damageSeverity);

  if (triageState.status === "loading") {
    return (
      <section className="space-y-5">
        <PriorityActionPlaceholder text="Analyzing this case" />
        <div>
          <h3 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Dispatch Briefing
          </h3>
          <div className="bg-[var(--bg-elevated)] p-4">
            <p className="animate-pulse font-mono text-[11px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
              ANALYZING<span className="triage-cursor">_</span>
            </p>
            {triageState.showEstimate ? (
              <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">~3-5 seconds</p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (triageState.status === "error") {
    return (
      <section className="space-y-5">
        <PriorityActionPlaceholder text="Click Generate Briefing to analyze this case" />
        <p className="rounded-[3px] border border-red-500/60 bg-[var(--bg-elevated)] p-3 font-mono text-[11px] text-red-300">
          {triageState.message}
        </p>
      </section>
    );
  }

  if (triageState.status !== "ready") {
    return (
      <section className="space-y-5">
        <PriorityActionPlaceholder text="Click Generate Briefing to analyze this case" />
        <div>
          <h3 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
            Dispatch Briefing
          </h3>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            Briefing not generated yet.
          </p>
        </div>
      </section>
    );
  }

  const { result } = triageState;

  return (
    <section className="space-y-5">
      <div>
        <h3 className="mb-1 font-mono text-[10px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
          Priority Action
        </h3>
        <p className="rounded-[3px] border-l-[3px] border-[var(--accent)] bg-[var(--bg-elevated)] px-[14px] py-[10px] font-sans text-[15px] font-semibold text-[var(--text-primary)]">
          {result.dispatch.priority_action}
        </p>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Dispatch Briefing
        </h3>
        <p
          className="border-l-[3px] bg-[var(--bg-elevated)] py-3 pr-4 pl-4 font-mono text-xs leading-[1.7] text-[var(--text-secondary)]"
          style={{ borderLeftColor: severityColor }}
        >
          {result.dispatch.briefing}
        </p>
        {result.dispatch.access_notes !== null ? (
          <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
            ⚠ {result.dispatch.access_notes}
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Triage Assessment
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-sans text-[13px] text-[var(--text-secondary)] italic">
            {result.triage.primary_concern}
          </p>
          <Badge
            variant="outline"
            className="rounded-[3px] border bg-transparent px-2 py-0.5 font-mono text-[10px] font-normal uppercase"
            style={getTimeSensitivityStyles(result.triage.time_sensitivity)}
          >
            {result.triage.time_sensitivity}
          </Badge>
          <p className="font-mono text-[10px] text-[var(--text-muted)]">
            CONF {result.triage.confidence.toFixed(2)}
          </p>
        </div>
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
          {result.triage.immediate_risks.map((risk) => (
            <li key={risk}>▸ {risk}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-mono text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Dispatch Resources
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.resourceMatcher.resource_tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="rounded-[3px] border bg-[#161616] px-2 py-0.5 font-mono text-[10px] font-normal text-[#999999]"
              style={getResourceTagStyles(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)] italic">
          {result.resourceMatcher.rationale}
          {result.fallback ? " Fallback briefing used." : ""}
        </p>
      </div>
    </section>
  );
}

function PriorityActionPlaceholder({ text }: { text: string }) {
  return (
    <div>
      <h3 className="mb-1 font-mono text-[10px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
        Priority Action
      </h3>
      <p className="rounded-[3px] border-l-[3px] border-[var(--accent)] bg-[var(--bg-elevated)] px-[14px] py-[10px] font-sans text-[15px] font-semibold text-[var(--text-muted)]">
        {text}
      </p>
    </div>
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

function getTimeSensitivityStyles(value: "hours" | "days" | "weeks" | "none") {
  if (value === "hours") {
    return { borderColor: "rgba(239, 68, 68, 0.55)", color: "#ef4444" };
  }
  if (value === "days") {
    return { borderColor: "rgba(249, 115, 22, 0.55)", color: "#f97316" };
  }
  if (value === "weeks") {
    return { borderColor: "rgba(234, 179, 8, 0.55)", color: "#eab308" };
  }
  return { borderColor: "rgba(64, 64, 64, 0.7)", color: "#777777" };
}

function getResourceTagStyles(tag: string) {
  if (tag === "medical_o2" || tag === "dialysis_transport" || tag === "medical_advanced") {
    return { borderColor: "var(--accent)" };
  }

  return { borderColor: "#282828" };
}
