import { describe, it, expect } from "vitest";
import { evaluateOrder, SAMPLE_ORDERS, type RawOrder } from "./orders";

const base: RawOrder = {
  orderId: "T", customer: "c", sku: "s", itemName: "i", quantityRequired: 100, availableInventory: 100,
  requiredDispatchDate: "2026-10-25", replenishmentDate: null, replenishmentQty: null, aiExplanation: "",
};

describe("evaluateOrder", () => {
  it("sufficient stock is ON_TRACK", () => {
    expect(evaluateOrder(base).status).toBe("ON_TRACK");
  });
  it("shortage with replenishment after dispatch is AT_RISK", () => {
    const r = evaluateOrder({ ...base, availableInventory: 20, replenishmentDate: "2026-10-30", replenishmentQty: 200 });
    expect(r.status).toBe("AT_RISK");
    expect(r.shortage).toBe(80);
  });
  it("shortage with no replenishment is AT_RISK", () => {
    expect(evaluateOrder({ ...base, availableInventory: 20 }).status).toBe("AT_RISK");
  });
  it("missing inventory is NEEDS_REVIEW", () => {
    expect(evaluateOrder({ ...base, availableInventory: null }).status).toBe("NEEDS_REVIEW");
  });
  it("past replenishment date is NEEDS_REVIEW (conflict)", () => {
    expect(evaluateOrder({ ...base, availableInventory: 20, replenishmentDate: "2026-10-01", replenishmentQty: 100 }).status).toBe("NEEDS_REVIEW");
  });
  it("sample data includes every status", () => {
    const s = new Set(SAMPLE_ORDERS.map((o) => evaluateOrder(o).status));
    expect(s.size).toBe(3);
  });
});
