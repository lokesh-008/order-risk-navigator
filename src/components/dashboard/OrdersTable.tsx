import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import type { EvaluatedOrder } from "@/lib/orders";

const fmt = (n: number | null) => (n == null ? <span className="text-review">—</span> : n.toLocaleString());
const date = (d: string | null) => (d ? d : <span className="text-muted-foreground">—</span>);

export function OrdersTable({ orders, onOpen }: { orders: EvaluatedOrder[]; onOpen: (o: EvaluatedOrder) => void }) {
  if (!orders.length) {
    return <div className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground">No orders match your search or filter.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            {["Order ID", "Item / SKU", "Qty req.", "Available", "Dispatch", "Replenishment", "Status", "Reason", "Recommended action"].map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow
              key={o.orderId}
              tabIndex={0}
              onClick={() => onOpen(o)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(o))}
              className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
            >
              <TableCell className="whitespace-nowrap font-mono text-sm font-medium">{o.orderId}</TableCell>
              <TableCell>
                <div className="min-w-[160px] text-sm">{o.itemName}</div>
                <div className="font-mono text-xs text-muted-foreground">{o.sku}</div>
              </TableCell>
              <TableCell className="text-right font-mono">{fmt(o.quantityRequired)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(o.availableInventory)}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-sm">{date(o.requiredDispatchDate)}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-sm">{date(o.replenishmentDate)}</TableCell>
              <TableCell><StatusBadge status={o.status} /></TableCell>
              <TableCell className="min-w-[200px] text-sm">{o.reason}</TableCell>
              <TableCell className="min-w-[220px] text-sm text-muted-foreground">{o.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
