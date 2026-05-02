import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { triageOutputSchema } from "./triage";

export const dispatchInputSchema = z.object({
  registrant: z.object({
    id: z.string(),
    fullName: z.string(),
    age: z.number().nullable(),
    address: z.string(),
    dependencies: z.array(z.string()),
  }),
  damage: z.object({
    severity: z.enum(["minor", "major", "destroyed", "none"]),
    polygonNotes: z.string().nullable(),
  }),
  triage: triageOutputSchema,
  hoursSinceContact: z.number().nullable(),
});

export const dispatchOutputSchema = z.object({
  briefing: z.string(),
  access_notes: z.string().nullable(),
  priority_action: z.string(),
});

export type DispatchInput = z.infer<typeof dispatchInputSchema>;
export type DispatchOutput = z.infer<typeof dispatchOutputSchema>;

const MODEL = "claude-sonnet-4-5";
const SYSTEM_PROMPT =
  "You are an emergency dispatch coordinator briefing a field unit en route to a scene. Write in radio dispatch style: address first, then patient identifier, then situation, then tactical notes, then action. Never state the priority tier — it is shown separately. Never use hedging language ('appears', 'may', 'seems'). Never use passive voice. Every sentence is a fact or an instruction. The briefing must be readable aloud in under 8 seconds. If the patient is deaf or hard of hearing, end with a tactical callout: 'Resident cannot hear approach — announce visually.' If oxygen-dependent, state 'Assume O2 supply compromised' as a discrete sentence. Respond ONLY with valid JSON.";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runDispatchAgent(input: DispatchInput): Promise<DispatchOutput> {
  const parsedInput = dispatchInputSchema.parse(input);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
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

    return dispatchOutputSchema.parse(parseJsonObject(extractText(message)));
  } catch (error) {
    throw new Error("Dispatch agent failed", { cause: error });
  }
}

function buildUserPrompt(input: DispatchInput): string {
  return `Registrant:
- name: ${input.registrant.fullName}
- age: ${input.registrant.age ?? "unknown"}
- address: ${input.registrant.address}
- dependencies: ${JSON.stringify(input.registrant.dependencies)}

Damage:
- severity: ${input.damage.severity}
- location notes: ${input.damage.polygonNotes ?? "none"}

Triage assessment:
- priority_tier: ${input.triage.priority_tier}
- primary_concern: ${input.triage.primary_concern}
- immediate_risks: ${JSON.stringify(input.triage.immediate_risks)}
- time_sensitivity: ${input.triage.time_sensitivity}
- confidence: ${input.triage.confidence}

hoursSinceContact: ${input.hoursSinceContact ?? "null"}

Use valid JSON with double-quoted strings.
Respond only with this JSON structure: { "briefing": string (2-4 sentences, dispatch voice, present tense), "access_notes": string | null (road/structural access concerns, or null if none), "priority_action": string (one sentence, imperative, the single most important thing the responder must do first) }`;
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
