import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/orders";

export const STATUS_META: Record<OrderStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ON_TRACK: { label: "On track", className: "bg-ok-soft text-ok border-ok/30", Icon: CheckCircle2 },
  AT_RISK: { label: "At risk", className: "bg-risk-soft text-risk border-risk/30", Icon: AlertTriangle },
  NEEDS_REVIEW: { label: "Needs review", className: "bg-review-soft text-review border-review/40", Icon: HelpCircle },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className, Icon } = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
