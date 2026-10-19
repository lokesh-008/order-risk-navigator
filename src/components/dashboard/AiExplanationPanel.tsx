import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { explainOrder } from "@/lib/explain.functions";
import { toExplainInput } from "@/lib/explain";
import type { EvaluatedOrder } from "@/lib/orders";

export function AiExplanationPanel({ order }: { order: EvaluatedOrder }) {
  const explain = useServerFn(explainOrder);
  const q = useQuery({
    queryKey: ["ai-explanation", order.orderId],
    queryFn: () => explain({ data: toExplainInput(order) }),
    staleTime: Infinity,
    retry: false, // server already does one bounded retry
  });

  const result = q.data;
  const success = result && result.ok ? result : null;
  const fallbackReason = q.isError ? "AI service could not be reached." : result && !result.ok ? result.error : null;

  return (
    <section className="rounded-md border border-dashed border-ai/40 bg-ai-soft" aria-live="polite">
      <div className="flex items-center gap-2 px-4 py-2">
        <Sparkles className="h-4 w-4 text-ai" aria-hidden />
        <h3 className="text-sm font-semibold text-ai">AI-generated explanation</h3>
        <span className="ml-auto text-[11px] text-ai">
          {q.isPending ? "Generating…" : success ? `Gemini · ${success.model}` : "Sample fallback"}
        </span>
      </div>

      {q.isPending && (
        <p className="flex items-center gap-2 px-4 pb-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Generating explanation…
        </p>
      )}

      {success && (
        <div className="space-y-2 px-4 pb-3 text-sm leading-relaxed">
          <p>{success.explanation}</p>
          <p><span className="font-medium">Suggested next step: </span>{success.recommendedAction}</p>
        </div>
      )}

      {fallbackReason && (
        <div className="space-y-2 px-4 pb-3 text-sm leading-relaxed">
          <p className="flex items-start gap-1.5 text-xs text-review">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {fallbackReason} Showing sample explanation instead.
          </p>
          <p>{order.aiExplanation}</p>
        </div>
      )}

      <p className="border-t border-ai/20 px-4 py-2 text-[11px] text-muted-foreground">
        Narrative only — may be inaccurate. Status is set by the deterministic checks above. No delivery date is guaranteed.
      </p>
    </section>
  );
}
