import { Package, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvaluatedOrder, OrderStatus } from "@/lib/orders";

interface Props {
  orders: EvaluatedOrder[];
  active: OrderStatus | "ALL";
  onSelect: (s: OrderStatus | "ALL") => void;
}

export function SummaryCards({ orders, active, onSelect }: Props) {
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const cards = [
    { key: "ALL" as const, label: "Total orders", value: orders.length, Icon: Package, tone: "border-l-primary text-primary" },
    { key: "ON_TRACK" as const, label: "On track", value: count("ON_TRACK"), Icon: CheckCircle2, tone: "border-l-ok text-ok" },
    { key: "AT_RISK" as const, label: "At risk", value: count("AT_RISK"), Icon: AlertTriangle, tone: "border-l-risk text-risk" },
    { key: "NEEDS_REVIEW" as const, label: "Needs review", value: count("NEEDS_REVIEW"), Icon: HelpCircle, tone: "border-l-review text-review" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ key, label, value, Icon, tone }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          aria-pressed={active === key}
          className={cn(
            "rounded-md border border-l-4 bg-card p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tone,
            active === key && "ring-2 ring-ring",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="mt-2 font-mono text-3xl font-semibold text-foreground">{value}</div>
        </button>
      ))}
    </div>
  );
}
