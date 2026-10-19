import { createServerFn } from "@tanstack/react-start";
import {
  buildPrompt, explainInputSchema, validateModelOutput, GEMINI_MODEL,
  MAX_ACTION_CHARS, MAX_EXPLANATION_CHARS, type ExplainResult,
} from "./explain";

/** Server-only Gemini call. The key is read inside the handler and never returned or logged. */
export const explainOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => explainInputSchema.parse(data))
  .handler(async ({ data }): Promise<ExplainResult> => {
    const apiKey = process.env["GOOGLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI explanations are not configured." };

    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(data) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            explanation: { type: "STRING", maxLength: MAX_EXPLANATION_CHARS },
            recommendedAction: { type: "STRING", maxLength: MAX_ACTION_CHARS },
          },
          required: ["explanation", "recommendedAction"],
        },
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    let res: Response | null = null;
    // One bounded retry, only for rate limits and server errors.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body,
        });
      } catch {
        res = null;
      }
      if (res && res.status !== 429 && res.status < 500) break;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
    }

    if (!res) {
      console.error("[explainOrder] network error", { orderId: data.orderId });
      return { ok: false, error: "Could not reach the AI service." };
    }
    if (!res.ok) {
      console.error("[explainOrder] Gemini HTTP error", { orderId: data.orderId, status: res.status });
      const msg =
        res.status === 429 ? "AI service is busy. Try again shortly."
        : res.status === 401 || res.status === 403 ? "AI service rejected the request (check API key access)."
        : res.status === 400 ? "AI request was invalid."
        : "AI service is temporarily unavailable.";
      return { ok: false, error: msg };
    }

    let raw: string | undefined;
    try {
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
      };
      if (json.promptFeedback?.blockReason) return { ok: false, error: "AI declined to answer." };
      raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    } catch {
      return { ok: false, error: "AI returned an unreadable response." };
    }

    const v = validateModelOutput(raw, data.status);
    if (!v.ok) {
      console.warn("[explainOrder] rejected model output", { orderId: data.orderId, reason: v.reason });
      return { ok: false, error: `AI explanation rejected (${v.reason.replace("_", " ")}).` };
    }
    return { ok: true, ...v.value, model: GEMINI_MODEL };
  });
