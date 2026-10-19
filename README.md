# Order Delay Risk Assistant

A dashboard that helps manufacturing operations teams find customer orders that may be delayed because of inventory shortages or replenishment arriving after the required dispatch date.

> **Prototype status:** runs on realistic **fictional sample data** (12 orders). No ERP, database or inventory system is connected.

## Problem statement

Operations teams often discover inventory-driven delays too late, after the dispatch date has slipped. Stock on hand, inbound replenishment and dispatch dates live in different places, and checking them by hand is slow and error-prone.

### Objectives
- Flag orders as **On track**, **At risk** or **Needs review** using transparent, deterministic rules.
- Explain each result in plain language and suggest a practical next step.
- Keep rule-based decisions clearly separate from AI-generated narrative. The AI never sets or changes a status.
- Never claim that an order is guaranteed to arrive on time.

## Key features
- **Summary cards:** total, on-track, at-risk and needs-review counts. Clicking a card filters the table.
- **Orders table:** search and status filtering across the sample orders.
- **Order detail panel:** quantities, shortage, dispatch and replenishment dates, plus each deterministic check with pass / fail / not-determinable.
- **AI explanation panel (Gemini):** a server-generated explanation and recommended action, with loading, success and fallback states.
- **Validated AI output:** responses that are empty, malformed, too long or contradict the deterministic status are rejected. The panel then shows the sample explanation.
- **Sample cases:** sufficient stock, insufficient stock with late or partial replenishment, and missing or conflicting data.
- **Responsive layout.**

## Screenshots

> _Placeholders. Screenshots have not been added to the repository yet._

| View | Screenshot |
|------|------------|
| Dashboard overview | `docs/screenshots/dashboard.png` _(placeholder)_ |
| Order detail with deterministic checks | `docs/screenshots/order-detail.png` _(placeholder)_ |
| AI explanation (Gemini success) | `docs/screenshots/ai-success.png` _(placeholder)_ |
| AI explanation (sample fallback) | `docs/screenshots/ai-fallback.png` _(placeholder)_ |

## Technology stack
- **Framework:** TanStack Start v1 (React 19, TanStack Router, server functions)
- **Build tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (Radix UI) components, lucide-react icons
- **Data fetching:** TanStack Query
- **Validation:** Zod
- **AI:** Google Gemini API (`gemini-2.5-flash`), called only from server-side code
- **Testing:** Vitest, Testing Library, jsdom
- **Runtime target:** Cloudflare Workers (edge)

## System architecture and workflow

```text
Sample orders (src/lib/orders.ts)
        |
        v
evaluateOrder()  -- deterministic rules --> status + checks + reason + action
        |
        +--> Summary cards / Orders table / Detail panel (browser)
        |
        v  (order facts + checks only, no customer name)
explainOrder server function (src/lib/explain.functions.ts)
        |  reads GOOGLE_API_KEY server-side, one bounded retry on 429/5xx
        v
Gemini API --> JSON { explanation, recommendedAction }
        |
        v
validateModelOutput() -- rejects empty / malformed / too long / contradictory
        |
        +--> success: "Gemini · <model>" label
        +--> failure: "Sample fallback" label + reason + sample text
```

### Key files
| Path | Purpose |
|------|---------|
| `src/lib/orders.ts` | Sample data and the deterministic `evaluateOrder` rules. The **only** place status is decided. |
| `src/lib/explain.ts` | Browser-safe input schema, prompt builder and model-output validation. |
| `src/lib/explain.functions.ts` | Server function that calls Gemini. |
| `src/components/dashboard/*` | Summary cards, table, status badge, detail sheet, AI panel. |
| `src/routes/index.tsx` | Dashboard page. |
| `src/lib/*.test.ts`, `src/test/*` | Automated tests. |

### Status rules (summary)
- **Needs review:** required data is missing or conflicting, so a shortage can't be reliably determined.
- **On track:** available inventory covers the required quantity.
- **At risk:** there is a shortage and no replenishment is scheduled, it arrives after the dispatch date, or it doesn't bring enough units.

"Today" is a fixed reference date in `src/lib/orders.ts`, so sample results stay stable.

## Setup and run

Requirements: Node.js (with npm) or Bun. The repository includes `bun.lock`.

```sh
git clone <your-repository-url>
cd <repository-folder>
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Available scripts (from `package.json`):

| Script | Command |
|--------|---------|
| `dev` | `vite dev` |
| `build` | `vite build` |
| `build:dev` | `vite build --mode development` |
| `preview` | `vite preview` |
| `lint` | `eslint .` |
| `format` | `prettier --write .` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

## Gemini API secret configuration

The server function reads `GOOGLE_API_KEY` from the server environment inside its handler. The key is never sent to the browser, returned in responses or written to logs.

- **In Lovable:** add `GOOGLE_API_KEY` under **Project Settings → Secrets**.
- **Local development:** provide `GOOGLE_API_KEY` as a server environment variable, e.g. in a local `.env` or `.dev.vars` file. Both are git-ignored.
- **Never** prefix it with `VITE_`. That would bundle the key into browser code.
- If the key is missing, the panel shows "AI explanations are not configured." and the sample explanation. The dashboard keeps working.

## Testing

```sh
bun run test       # or: npm test
```

Coverage:
- `src/lib/orders.test.ts`: deterministic status rules for each sample case.
- `src/lib/explain.test.ts`: rejects empty, non-JSON, incomplete, overly long and contradictory model output, delivery guarantees and status-change claims. Also checks that the AI input excludes customer names and rejects unknown statuses.
- `src/test/app-routing.test.tsx`: routing smoke test.

### Verified results (19 Oct 2026)
- `vitest run`: **3 test files, 18 tests passed**.
- Manual browser check: a live Gemini call showed an explanation labelled "Gemini · gemini-2.5-flash".
- Simulated failure (blocked request to the AI service): the panel showed "Sample fallback", "AI service could not be reached. Showing sample explanation instead." and the sample text. The order's status was unchanged.

## Limitations
- Uses fictional sample data only, with a fixed reference date.
- No authentication, persistence, or integration with ERP or inventory systems.
- AI explanations may be inaccurate. They are narrative only and checked with pattern-based guards, which can't catch every misleading phrasing.
- No caching or rate limiting for Gemini calls beyond one bounded retry.
- Not yet deployed.

## Future improvements
- Connect real order, inventory and purchase-order data sources.
- Add user sign-in and role-based access.
- Cache AI explanations per order version and add server-side rate limiting.
- Support partial-shipment and alternate-SKU suggestions in the rules.
- Add CSV export and alerting for newly at-risk orders.
- Add end-to-end browser tests to CI.
