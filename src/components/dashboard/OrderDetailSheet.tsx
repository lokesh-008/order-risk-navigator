import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, X, Minus, Cpu, Sparkles } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { EvaluatedOrder } from "@/lib/orders";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm">{value ?? <span className="text-review">Missing</span>}</div>
    </div>
  );
}

export function OrderDetailSheet({ order, onClose }: { order: EvaluatedOrder | null; onClose: () => void }) {
  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {order && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <SheetTitle className="font-mono">{order.orderId}</SheetTitle>
                <StatusBadge status={order.status} />
              </div>
              <SheetDescription>{order.customer} · {order.itemName} ({order.sku})</SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted/50 p-4">
                <Field label="Quantity required" value={order.quantityRequired?.toLocaleString()} />
                <Field label="Available inventory" value={order.availableInventory?.toLocaleString()} />
                <Field label="Shortage" value={order.shortage == null ? "Not determinable" : order.shortage.toLocaleString()} />
                <Field label="Inbound quantity" value={order.replenishmentQty?.toLocaleString() ?? (order.replenishmentDate ? null : "None scheduled")} />
                <Field label="Required dispatch" value={order.requiredDispatchDate} />
                <Field label="Expected replenishment" value={order.replenishmentDate ?? "None scheduled"} />
              </div>

              <section className="rounded-md border">
                <div className="flex items-center gap-2 border-b bg-muted px-4 py-2">
                  <Cpu className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold">Deterministic inventory checks</h3>
                  <span className="ml-auto text-[11px] text-muted-foreground">Rule-based</span>
                </div>
                <ul className="divide-y">
                  {order.checks.map((c) => (
                    <li key={c.name} className="flex gap-3 px-4 py-2.5">
                      {c.passed === true ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : c.passed === false ? <X className="mt-0.5 h-4 w-4 shrink-0 text-risk" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                      <div>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.detail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t px-4 py-3 text-sm">
                  <div><span className="font-medium">Result: </span>{order.reason}</div>
                  <div className="mt-1"><span className="font-medium">Recommended next step: </span>{order.action}</div>
                </div>
              </section>

              <section className="rounded-md border border-dashed border-ai/40 bg-ai-soft">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-ai" aria-hidden />
                  <h3 className="text-sm font-semibold text-ai">AI-generated explanation</h3>
                  <span className="ml-auto text-[11px] text-ai">Sample · unverified</span>
                </div>
                <p className="px-4 pb-3 text-sm leading-relaxed">{order.aiExplanation}</p>
                <p className="border-t border-ai/20 px-4 py-2 text-[11px] text-muted-foreground">
                  Narrative only — may be inaccurate. Status is set by the deterministic checks above. No delivery date is guaranteed.
                </p>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
