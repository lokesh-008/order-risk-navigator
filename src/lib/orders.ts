export type OrderStatus = "ON_TRACK" | "AT_RISK" | "NEEDS_REVIEW";

export interface RawOrder {
  orderId: string;
  customer: string;
  sku: string;
  itemName: string;
  quantityRequired: number | null;
  availableInventory: number | null;
  requiredDispatchDate: string | null; // ISO yyyy-mm-dd
  replenishmentDate: string | null;
  replenishmentQty: number | null;
  /** Sample AI narrative. In production this would come from a model. */
  aiExplanation: string;
}

export interface CheckResult {
  name: string;
  passed: boolean | null; // null = could not evaluate
  detail: string;
}

export interface EvaluatedOrder extends RawOrder {
  status: OrderStatus;
  reason: string;
  action: string;
  shortage: number | null;
  checks: CheckResult[];
}

/** Fixed reference date so sample results are reproducible. */
export const REFERENCE_DATE = "2026-10-19";

const isValidDate = (d: string | null): d is string =>
  !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Deterministic rule-based inventory check. No AI involved. */
export function evaluateOrder(o: RawOrder, today = REFERENCE_DATE): EvaluatedOrder {
  const checks: CheckResult[] = [];
  const review = (reason: string, action: string): EvaluatedOrder => ({
    ...o, status: "NEEDS_REVIEW", reason, action, shortage: null, checks,
  });

  // 1. Data completeness
  const missing: string[] = [];
  if (o.quantityRequired == null) missing.push("quantity required");
  if (o.availableInventory == null) missing.push("available inventory");
  if (!isValidDate(o.requiredDispatchDate)) missing.push("valid dispatch date");
  checks.push({
    name: "Required data present",
    passed: missing.length === 0,
    detail: missing.length ? `Missing: ${missing.join(", ")}` : "All required fields present",
  });
  if (missing.length) return review(`Missing ${missing.join(", ")}`, "Confirm missing data with planning / ERP owner before committing a date");

  const qty = o.quantityRequired!;
  const inv = o.availableInventory!;
  const dispatch = o.requiredDispatchDate!;

  // 2. Data consistency
  const conflicts: string[] = [];
  if (qty <= 0) conflicts.push("quantity required is not positive");
  if (inv < 0) conflicts.push("available inventory is negative");
  if (o.replenishmentDate != null && !isValidDate(o.replenishmentDate)) conflicts.push("replenishment date is invalid");
  if (isValidDate(o.replenishmentDate) && o.replenishmentQty == null) conflicts.push("replenishment date set without quantity");
  if (isValidDate(o.replenishmentDate) && daysBetween(o.replenishmentDate, today) > 0)
    conflicts.push("replenishment date is in the past but not reflected in inventory");
  checks.push({
    name: "Data consistent",
    passed: conflicts.length === 0,
    detail: conflicts.length ? conflicts.join("; ") : "No conflicting values detected",
  });
  if (conflicts.length) return review(`Conflicting data: ${conflicts[0]}`, "Reconcile inventory and purchase-order records, then re-run check");

  // 3. Stock coverage
  const shortage = Math.max(0, qty - inv);
  checks.push({
    name: "On-hand stock covers order",
    passed: shortage === 0,
    detail: shortage === 0 ? `${inv} available ≥ ${qty} required` : `Short by ${shortage} units`,
  });
  if (shortage === 0) {
    return { ...o, status: "ON_TRACK", reason: "Sufficient on-hand inventory", action: "Reserve stock and proceed with picking", shortage, checks };
  }

  // 4. Replenishment timing
  if (!isValidDate(o.replenishmentDate)) {
    checks.push({ name: "Replenishment before dispatch", passed: false, detail: "No replenishment scheduled" });
    return { ...o, status: "AT_RISK", reason: `Short ${shortage} units, no replenishment scheduled`, action: "Raise expedite PO or source from alternate site", shortage, checks };
  }
  const coverQty = (o.replenishmentQty ?? 0) >= shortage;
  const lead = daysBetween(o.replenishmentDate, dispatch);
  checks.push({
    name: "Replenishment before dispatch",
    passed: lead >= 0,
    detail: lead >= 0 ? `Arrives ${lead} day(s) before dispatch` : `Arrives ${-lead} day(s) after dispatch`,
  });
  checks.push({
    name: "Replenishment covers shortage",
    passed: coverQty,
    detail: `${o.replenishmentQty} inbound vs ${shortage} short`,
  });
  if (lead < 0) {
    return { ...o, status: "AT_RISK", reason: `Short ${shortage} units; replenishment ${-lead} day(s) late`, action: "Expedite supplier, offer partial shipment, or renegotiate dispatch date", shortage, checks };
  }
  if (!coverQty) {
    return { ...o, status: "AT_RISK", reason: `Inbound qty does not cover ${shortage}-unit shortage`, action: "Source remaining units or split shipment", shortage, checks };
  }
  return {
    ...o, status: "ON_TRACK",
    reason: `Shortage covered by inbound stock ${lead} day(s) before dispatch`,
    action: lead <= 2 ? "Tight buffer — confirm supplier ETA and monitor daily" : "Monitor inbound receipt",
    shortage, checks,
  };
}

export const SAMPLE_ORDERS: RawOrder[] = [
  { orderId: "SO-24081", customer: "Nordhaven Pumps", sku: "BRG-6205-ZZ", itemName: "Deep-groove ball bearing 6205", quantityRequired: 400, availableInventory: 1250, requiredDispatchDate: "2026-10-23", replenishmentDate: null, replenishmentQty: null,
    aiExplanation: "On-hand stock comfortably exceeds the order quantity, so this order appears unlikely to be affected by inventory. Other factors such as picking capacity or carrier availability are not considered here." },
  { orderId: "SO-24082", customer: "Keller Agritech", sku: "SHF-40CR-500", itemName: "Hardened shaft 40Cr, 500mm", quantityRequired: 120, availableInventory: 35, requiredDispatchDate: "2026-10-24", replenishmentDate: "2026-10-30", replenishmentQty: 200,
    aiExplanation: "The inbound batch is scheduled six days after the required dispatch date, which likely leaves 85 units unfulfilled on time. Contacting the supplier about expediting or proposing a partial shipment of 35 units could reduce customer impact." },
  { orderId: "SO-24083", customer: "Brightline Rail", sku: "GSK-NBR-80", itemName: "NBR gasket 80mm", quantityRequired: 2000, availableInventory: 1500, requiredDispatchDate: "2026-10-28", replenishmentDate: "2026-10-22", replenishmentQty: 1000,
    aiExplanation: "Replenishment is expected well before dispatch and should cover the 500-unit gap. This depends on the supplier meeting its ETA; a delay of more than six days would put the order at risk." },
  { orderId: "SO-24084", customer: "Orion Hydraulics", sku: "VLV-HYD-12", itemName: "Hydraulic control valve 12V", quantityRequired: 60, availableInventory: null, requiredDispatchDate: "2026-10-26", replenishmentDate: "2026-10-25", replenishmentQty: 40,
    aiExplanation: "Inventory for this SKU is not reported, so the system cannot determine whether the order is covered. A cycle count or ERP sync check is suggested before confirming a date to the customer." },
  { orderId: "SO-24085", customer: "Halden Marine", sku: "MTR-3PH-7K5", itemName: "3-phase motor 7.5kW", quantityRequired: 8, availableInventory: 2, requiredDispatchDate: "2026-10-21", replenishmentDate: null, replenishmentQty: null,
    aiExplanation: "There is a 6-unit shortage and no inbound purchase order on record. Without action, this order will likely miss its dispatch date. Checking other warehouses or an expedited purchase may help." },
  { orderId: "SO-24086", customer: "Vantage Packaging", sku: "BLT-M10-50", itemName: "Hex bolt M10x50 A2", quantityRequired: 5000, availableInventory: 5000, requiredDispatchDate: "2026-10-20", replenishmentDate: null, replenishmentQty: null,
    aiExplanation: "Stock exactly matches the requirement, leaving no buffer for damaged or rejected units. Reserving stock promptly is advisable." },
  { orderId: "SO-24087", customer: "Sterling Foods", sku: "CNV-BLT-1200", itemName: "Conveyor belt 1200mm", quantityRequired: 15, availableInventory: 4, requiredDispatchDate: "2026-10-27", replenishmentDate: "2026-10-12", replenishmentQty: 20,
    aiExplanation: "The replenishment date is already in the past, yet inventory has not increased. The receipt may not have been posted, or the delivery may have slipped. Records should be reconciled before relying on either value." },
  { orderId: "SO-24088", customer: "Keller Agritech", sku: "SEL-OIL-45", itemName: "Oil seal 45x62x8", quantityRequired: 300, availableInventory: 120, requiredDispatchDate: "2026-10-29", replenishmentDate: "2026-10-28", replenishmentQty: 100,
    aiExplanation: "Inbound stock arrives one day before dispatch but only covers 100 of the 180-unit shortage. Even if on time, roughly 80 units would remain short." },
  { orderId: "SO-24089", customer: "Brightline Rail", sku: "SPR-CMP-22", itemName: "Compression spring 22mm", quantityRequired: 900, availableInventory: 600, requiredDispatchDate: "2026-11-02", replenishmentDate: "2026-10-31", replenishmentQty: 500,
    aiExplanation: "The inbound lot should cover the gap with two days of buffer. This is a narrow window; daily ETA confirmation with the supplier is recommended." },
  { orderId: "SO-24090", customer: "Orion Hydraulics", sku: "CYL-HYD-63", itemName: "Hydraulic cylinder 63mm bore", quantityRequired: 25, availableInventory: 10, requiredDispatchDate: null, replenishmentDate: "2026-10-30", replenishmentQty: 30,
    aiExplanation: "No dispatch date is recorded, so timing risk cannot be assessed. The sales team should confirm the customer's required date." },
  { orderId: "SO-24091", customer: "Halden Marine", sku: "PMP-IMP-150", itemName: "Pump impeller 150mm", quantityRequired: 40, availableInventory: 52, requiredDispatchDate: "2026-11-05", replenishmentDate: null, replenishmentQty: null,
    aiExplanation: "Sufficient stock is on hand. No inventory-related risk is indicated by the current data." },
  { orderId: "SO-24092", customer: "Sterling Foods", sku: "GBX-RED-30", itemName: "Gear reducer 30:1", quantityRequired: 12, availableInventory: 3, requiredDispatchDate: "2026-10-22", replenishmentDate: "2026-11-04", replenishmentQty: null,
    aiExplanation: "A replenishment date exists but its quantity is missing, so coverage cannot be confirmed. Even if fully covered, the date is after dispatch." },
];
