import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const resourceTagSchema = z.enum([
  "medical_basic",
  "medical_advanced",
  "medical_o2",
  "dialysis_transport",
  "wheelchair_accessible_transport",
  "swift_water",
  "high_clearance_vehicle",
  "translator_es",
  "translator_so",
  "translator_hmn",
  "asl_interpreter",
  "wellness_check",
  "child_services",
  "pharmacy_courier",
  "cognitive_support_team",
  "sighted_guide",
]);

export const resourceMatcherInputSchema = z.object({
  registrantId: z.string(),
  dependencies: z.array(z.string()),
  priority_tier: z.enum(["P1", "P2", "P3", "P4"]),
});

export const resourceMatcherOutputSchema = z.object({
  resource_tags: z.array(resourceTagSchema),
  rationale: z.string(),
});

export type ResourceMatcherInput = z.infer<typeof resourceMatcherInputSchema>;
export type ResourceMatcherOutput = z.infer<typeof resourceMatcherOutputSchema>;

const MODEL = "claude-haiku-4-5";
const SYSTEM_PROMPT =
  "You are a disaster resource allocation specialist. Map the provided dependencies and priority tier to specific resource tags from the controlled vocabulary. Respond ONLY with valid JSON.";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runResourceMatcherAgent(
  input: ResourceMatcherInput,
): Promise<ResourceMatcherOutput> {
  const parsedInput = resourceMatcherInputSchema.parse(input);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(parsedInput),
        },
      ],
    });

    console.log(
      `[triage] ${parsedInput.registrantId}: ${message.usage.input_tokens}in ${message.usage.output_tokens}out`,
    );

    return resourceMatcherOutputSchema.parse(parseJsonObject(extractText(message)));
  } catch (error) {
    throw new Error("Resource matcher agent failed", { cause: error });
  }
}

function buildUserPrompt(input: ResourceMatcherInput): string {
  return `Dependencies: ${JSON.stringify(input.dependencies)}
Priority tier: ${input.priority_tier}

Select applicable tags from ONLY this list: medical_basic, medical_advanced, medical_o2, dialysis_transport, wheelchair_accessible_transport, swift_water, high_clearance_vehicle, translator_es, translator_so, translator_hmn, asl_interpreter, wellness_check, child_services, pharmacy_courier, cognitive_support_team, sighted_guide.
Use valid JSON with double-quoted strings.
Respond only with: { "resource_tags": string[] (2-6 tags), "rationale": string (max 20 words) }`;
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
