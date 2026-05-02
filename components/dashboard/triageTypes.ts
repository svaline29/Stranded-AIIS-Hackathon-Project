export type TriageBriefingResult = {
  registrantId: string;
  riskScore: number;
  triage: {
    priority_tier: "P1" | "P2" | "P3" | "P4";
    primary_concern: string;
    immediate_risks: string[];
    time_sensitivity: "hours" | "days" | "weeks" | "none";
    confidence: number;
  };
  dispatch: {
    briefing: string;
    access_notes: string | null;
    priority_action: string;
  };
  resourceMatcher: {
    resource_tags: string[];
    rationale: string;
  };
  generatedAt: number;
  cached: boolean;
  fallback: boolean;
};

export type TriageBriefingState =
  | { status: "idle" }
  | { status: "loading"; showEstimate: boolean }
  | { status: "ready"; result: TriageBriefingResult }
  | { status: "error"; message: string };
