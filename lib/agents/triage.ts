import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const triageInputSchema = z.object({
  registrant: z.object({
    id: z.string(),
    fullName: z.string(),
    age: z.number().nullable(),
    dependencies: z.array(z.string()),
    primaryLanguage: z.string(),
    lives_alone: z.boolean(),
    lastContactAt: z.number().nullable(),
  }),
  damage: z.object({
    severity: z.enum(["minor", "major", "destroyed", "none"]),
    polygonNotes: z.string().nullable(),
  }),
  hoursSinceContact: z.number().nullable(),
});

export const triageOutputSchema = z.object({
  priority_tier: z.enum(["P1", "P2", "P3", "P4"]),
  primary_concern: z.string(),
  immediate_risks: z.array(z.string()),
  time_sensitivity: z.enum(["hours", "days", "weeks", "none"]),
  confidence: z.number(),
});

export type TriageInput = z.infer<typeof triageInputSchema>;
export type TriageOutput = z.infer<typeof triageOutputSchema>;

const MODEL = "claude-sonnet-4-5";
const SYSTEM_PROMPT =
  "You are a disaster triage specialist. Analyze the provided registrant and damage data to produce a structured triage assessment. Be concise and clinical. Prioritize based on: (1) life-critical dependencies with time constraints (oxygen, dialysis, medication_critical), (2) structural damage severity, (3) isolation factors (lives_alone, limited_english, cognitive impairment), (4) age. If damage severity is none and there are no life-critical dependencies, assign P4 unless hoursSinceContact shows a concrete urgent delay. A null lastContactAt means no prior contact record, not confirmed prolonged loss of contact. Respond ONLY with valid JSON matching the specified schema — no preamble, no markdown.";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runTriageAgent(input: TriageInput): Promise<TriageOutput> {
  const parsedInput = triageInputSchema.parse(input);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(parsedInput),
        },
      ],
    });

    console.log(
      `[triage] ${parsedInput.registrant.id}: ${message.usage.input_tokens}in ${message.usage.output_tokens}out`,
    );

    return triageOutputSchema.parse(parseJsonObject(extractText(message)));
  } catch (error) {
    throw new Error("Triage agent failed", { cause: error });
  }
}

function buildUserPrompt(input: TriageInput): string {
  return `Registrant:
- id: ${input.registrant.id}
- fullName: ${input.registrant.fullName}
- age: ${input.registrant.age ?? "null"}
- dependencies: ${JSON.stringify(input.registrant.dependencies)}
- primaryLanguage: ${input.registrant.primaryLanguage}
- lives_alone: ${input.registrant.lives_alone}
- lastContactAt: ${input.registrant.lastContactAt ?? "null"}

Damage:
- severity: ${input.damage.severity}
- polygonNotes: ${input.damage.polygonNotes ?? "null"}

hoursSinceContact: ${input.hoursSinceContact ?? "null"}

Use valid JSON with double-quoted strings.
Respond only with this JSON structure: { "priority_tier": "P1"|"P2"|"P3"|"P4", "primary_concern": string (max 12 words), "immediate_risks": string[] (2-4 items, each max 10 words), "time_sensitivity": "hours"|"days"|"weeks"|"none", "confidence": number (0.0-1.0) }`;
}

function extractText(message: Anthropic.Messages.Message): string {
  const textBlock = message.content.find((block) => block.type === "text");

  if (textBlock === undefined) {
    throw new Error("Claude response did not include text content");
  }

  return textBlock.text.trim();
}

function parseJsonObject(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Claude response did not include a JSON object");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}
