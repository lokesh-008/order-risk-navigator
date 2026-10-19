import { describe, it, expect } from "vitest";
import { validateModelOutput, explainInputSchema, toExplainInput, buildPrompt } from "./explain";
import { evaluateOrder, SAMPLE_ORDERS } from "./orders";

const good = (explanation: string, recommendedAction = "Contact the supplier to confirm the ETA.") =>
  JSON.stringify({ explanation, recommendedAction });

describe("validateModelOutput", () => {
  it("accepts a well-formed, consistent explanation", () => {
    const r = validateModelOutput(good("Inbound stock arrives after the dispatch date, so 85 units are likely short."), "AT_RISK");
    expect(r.ok).toBe(true);
  });
  it("rejects empty output", () => {
    expect(validateModelOutput("", "AT_RISK")).toEqual({ ok: false, reason: "empty" });
    expect(validateModelOutput(undefined, "AT_RISK")).toEqual({ ok: false, reason: "empty" });
  });
  it("rejects non-JSON output", () => {
    expect(validateModelOutput("The order is late.", "AT_RISK")).toEqual({ ok: false, reason: "malformed" });
  });
  it("rejects JSON missing required fields", () => {
    expect(validateModelOutput(JSON.stringify({ explanation: "Only an explanation here, nothing else." }), "AT_RISK"))
      .toEqual({ ok: false, reason: "malformed" });
  });
  it("rejects overly long explanations", () => {
    expect(validateModelOutput(good("x".repeat(701)), "AT_RISK")).toEqual({ ok: false, reason: "too_long" });
  });
  it("rejects AT_RISK explanation claiming on track", () => {
    expect(validateModelOutput(good("Stock looks fine and the order is on track for dispatch."), "AT_RISK"))
      .toEqual({ ok: false, reason: "contradictory" });
  });
  it("rejects ON_TRACK explanation claiming at risk", () => {
    expect(validateModelOutput(good("This order is at risk because inbound stock may slip."), "ON_TRACK"))
      .toEqual({ ok: false, reason: "contradictory" });
  });
  it("rejects NEEDS_REVIEW explanation claiming no risk", () => {
    expect(validateModelOutput(good("There is no risk for this order based on the data."), "NEEDS_REVIEW"))
      .toEqual({ ok: false, reason: "contradictory" });
  });
  it("rejects delivery guarantees and status changes", () => {
    expect(validateModelOutput(good("Delivery is guaranteed because stock is sufficient on hand."), "ON_TRACK").ok).toBe(false);
    expect(validateModelOutput(good("Given the data, the status should be changed to on hold."), "AT_RISK").ok).toBe(false);
  });
});

describe("explain input", () => {
  it("every evaluated sample order produces valid input without customer data", () => {
    for (const o of SAMPLE_ORDERS) {
      const input = toExplainInput(evaluateOrder(o));
      expect(explainInputSchema.safeParse(input).success).toBe(true);
      expect(buildPrompt(input)).not.toContain(o.customer);
    }
  });
  it("rejects input with an unknown status", () => {
    const input = { ...toExplainInput(evaluateOrder(SAMPLE_ORDERS[0]!)), status: "LATE" };
    expect(explainInputSchema.safeParse(input).success).toBe(false);
  });
});
