import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Factory, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { OrderDetailSheet } from "@/components/dashboard/OrderDetailSheet";
import { evaluateOrder, REFERENCE_DATE, SAMPLE_ORDERS, type EvaluatedOrder, type OrderStatus } from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Order Delay Risk Assistant" },
      { name: "description", content: "Spot customer orders at risk of delay from inventory shortages or late replenishment." },
      { property: "og:title", content: "Order Delay Risk Assistant" },
      { property: "og:description", content: "Spot customer orders at risk of delay from inventory shortages or late replenishment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Filter = OrderStatus | "ALL";

function Dashboard() {
  const orders = useMemo(() => SAMPLE_ORDERS.map((o) => evaluateOrder(o)), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selected, setSelected] = useState<EvaluatedOrder | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (filter === "ALL" || o.status === filter) &&
        (!q || [o.orderId, o.sku, o.itemName, o.customer].some((v) => v.toLowerCase().includes(q))),
    );
  }, [orders, query, filter]);

  return (
    <div className="min-h-screen">
      <header className="bg-header text-header-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-accent text-accent-foreground">
            <Factory className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Order Delay Risk Assistant</h1>
            <p className="text-xs opacity-70">Inventory coverage vs. required dispatch</p>
          </div>
          <div className="ml-auto hidden font-mono text-xs opacity-70 sm:block">Checked as of {REFERENCE_DATE}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <SummaryCards orders={orders} active={filter} onSelect={setFilter} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order ID, SKU, item or customer"
              className="bg-card pl-9"
              aria-label="Search orders"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="bg-card sm:w-48" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ON_TRACK">On track</SelectItem>
              <SelectItem value="AT_RISK">At risk</SelectItem>
              <SelectItem value="NEEDS_REVIEW">Needs review</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{visible.length} of {orders.length}</span>
        </div>

        <OrdersTable orders={visible} onOpen={setSelected} />

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Status is computed by deterministic rules comparing stock, inbound supply and dates. "On track" means no inventory risk was detected in the current data — it is not a guarantee of on-time delivery. Sample data only.
        </p>
      </main>

      <OrderDetailSheet order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
