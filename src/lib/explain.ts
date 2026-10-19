// Client-safe helpers for AI explanations. No secrets here.
// The AI never decides status: it only explains the deterministic result.
import { z } from "zod";
import type { EvaluatedOrder } from "./orders";

export const GEMINI_MODEL = "gemini-2.5-flash";
export const MAX_EXPLANATION_CHARS = 700;
export const MAX_ACTION_CHARS = 300;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const explainInputSchema = z.object({
  orderId: z.string().min(1).max(40),
  sku: z.string().min(1).max(60),
  itemName: z.string().min(1).max(120),
  quantityRequired: z.number().nullable(),
  availableInventory: z.number().nullable(),
  requiredDispatchDate: isoDate,
  replenishmentDate: z.string().max(20).nullable(),
  replenishmentQty: z.number().nullable(),
  shortage: z.number().nullable(),
  status: z.enum(["ON_TRACK", "AT_RISK", "NEEDS_REVIEW"]),
  reason: z.string().min(1).max(300),
  action: z.string().min(1).max(300),
  checks: z
    .array(z.object({ name: z.string().max(80), passed: z.boolean().nullable(), detail: z.string().max(200) }))
    .max(10),
});
export type ExplainInput = z.infer<typeof explainInputSchema>;

/** Only evaluated facts + deterministic checks. No customer name, no sample text. */
export function toExplainInput(o: EvaluatedOrder): ExplainInput {
  return {
    orderId: o.orderId, sku: o.sku, itemName: o.itemName,
    quantityRequired: o.quantityRequired, availableInventory: o.availableInventory,
    requiredDispatchDate: o.requiredDispatchDate, replenishmentDate: o.replenishmentDate,
    replenishmentQty: o.replenishmentQty, shortage: o.shortage,
    status: o.status, reason: o.reason, action: o.action, checks: o.checks,
  };
}

export function buildPrompt(input: ExplainInput): string {
  return [
    "You assist a manufacturing operations team. An order's status was ALREADY determined by deterministic inventory rules.",
    "Rules for your answer:",
    "- Do NOT determine, change, question or restate a different status. Treat the given status as final.",
    "- Explain in plain language why the facts lead to the given status, then suggest one practical next step.",
    "- Never guarantee on-time delivery or arrival. Use hedged language (e.g. 'likely', 'appears').",
    "- Use only the facts provided. Do not invent numbers, suppliers or dates.",
    `- explanation: at most 3 sentences, under ${MAX_EXPLANATION_CHARS} characters. recommendedAction: one sentence, under ${MAX_ACTION_CHARS} characters.`,
    "Respond only with JSON matching the schema.",
    "",
    "Order facts (JSON):",
    JSON.stringify(input),
  ].join("\n");
}

export const modelOutputSchema = z.object({
  explanation: z.string().trim().min(20).max(MAX_EXPLANATION_CHARS),
  recommendedAction: z.string().trim().min(5).max(MAX_ACTION_CHARS),
});
export type ModelOutput = z.infer<typeof modelOutputSchema>;

const ALWAYS_FORBIDDEN = [
  /\bguarantee[ds]?\b/i,
  /\bwill (definitely|certainly|surely) (arrive|ship|be delivered)/i,
  /\b(status|it) should (be|change to)\b/i,
  /\b(re-?classif|downgrad|upgrad)\w*/i,
];
const CONTRADICTIONS: Record<ExplainInput["status"], RegExp[]> = {
  ON_TRACK: [/\bat[- ]risk\b/i, /\bneeds? review\b/i, /\bwill (be delayed|miss)\b/i],
  AT_RISK: [/\bon[- ]track\b/i, /\bno (inventory )?risk\b/i, /\bnot at risk\b/i, /\bsufficient (stock|inventory) (is )?(on hand|available)\b/i],
  NEEDS_REVIEW: [/\bon[- ]track\b/i, /\bnot at risk\b/i, /\bno (inventory )?risk\b/i],
};

export type ValidationResult = { ok: true; value: ModelOutput } | { ok: false; reason: string };

/** Validate raw model text. Rejects empty, malformed, too long or contradictory output. */
export function validateModelOutput(raw: string | null | undefined, status: ExplainInput["status"]): ValidationResult {
  if (!raw || !raw.trim()) return { ok: false, reason: "empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const result = modelOutputSchema.safeParse(parsed);
  if (!result.success) {
    const tooLong = result.error.issues.some((i) => i.code === "too_big");
    return { ok: false, reason: tooLong ? "too_long" : "malformed" };
  }
  const text = `${result.data.explanation} ${result.data.recommendedAction}`;
  if ([...ALWAYS_FORBIDDEN, ...CONTRADICTIONS[status]].some((re) => re.test(text))) {
    return { ok: false, reason: "contradictory" };
  }
  return { ok: true, value: result.data };
}

export type ExplainResult =
  | { ok: true; explanation: string; recommendedAction: string; model: string }
  | { ok: false; error: string };

export type ExplainSuccess = Extract<ExplainResult, { ok: true }>;
export const isExplainSuccess = (r: ExplainResult | undefined): r is ExplainSuccess => !!r && r.ok === true;
export type ExplainFailure = Extract<ExplainResult, { ok: false }>;
export const isExplainFailure = (r: ExplainResult | undefined): r is ExplainFailure => !!r && r.ok === false;
