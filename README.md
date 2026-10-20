# Order Delay Risk Assistant

An AI-assisted manufacturing dashboard that identifies customer orders at risk of delay due to inventory shortages or late replenishment.

**Project status:** Prototype | **Data:** 12 fictional sample orders | **AI:** Google Gemini API

## Overview

Manufacturing operations teams need to ensure that the required inventory is available before an order's dispatch date. Manually checking stock levels, shortages, and incoming replenishment can be time-consuming and error-prone.

The Order Delay Risk Assistant evaluates order and inventory data using deterministic business rules, assigns a risk status, and uses AI to explain the result in plain language.

The AI generates explanations and suggested actions only. **It does not determine or modify an order's status.**

## Key Features

- **Order monitoring:** View total orders and counts by risk status.
- **Search and filtering:** Find orders using order IDs, SKUs, item names, customers, or status.
- **Inventory risk evaluation:** Check stock availability, quantity shortages, and replenishment timing.
- **Order details:** Inspect dispatch dates, replenishment information, calculated shortages, and individual rule checks.
- **AI-generated explanations:** Receive a plain-language explanation and a recommended next step using Gemini.
- **Output validation:** Reject empty, malformed, incomplete, excessively long, or contradictory AI responses.
- **Fallback handling:** Display a sample explanation if the AI service fails, while preserving the deterministic order status.
- **Human review:** Flag missing or conflicting data and require review for at-risk or uncertain cases.
- **Responsive interface:** Use the dashboard across supported screen sizes.

## How It Works

```text
Fictional Order and Inventory Data
                |
                v
       Deterministic Rules
                |
                v
      Status + Rule Checks
                |
        +-------+-------+
        |               |
        v               v
   Dashboard       Evaluated Facts
                        |
                        v
               Server-side Function
                        |
                        v
                   Gemini API
                        |
                        v
                Response Validation
                        |
                 +------+------+
                 |             |
                 v             v
             Valid Reply    AI Failure
                 |             |
                 v             v
          AI Explanation   Sample Fallback
                 |             |
                 +------+------+
                        |
                        v
               Dashboard Display
```

## Order Status Logic

| Status | Meaning |
|---|---|
| **On track** | Available inventory covers the required quantity, with no inventory risk detected by the current rules. |
| **At risk** | A shortage exists and replenishment is missing, too late, or insufficient. |
| **Needs review** | Required information is missing, invalid, or conflicting, preventing reliable evaluation. |

The dashboard's "On track" status does not guarantee on-time delivery. It only indicates that no inventory risk was identified using the available data and implemented rules.

## Technology Stack

| Category | Technologies |
|---|---|
| Framework | TanStack Start, React |
| Language | TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |
| Routing and data utilities | TanStack Router, TanStack Query |
| Validation | Zod |
| AI integration | Google Gemini API — `gemini-2.5-flash` |
| Testing | Vitest, Testing Library, jsdom |
| Runtime target | Cloudflare Workers |


## Getting Started

### Prerequisites

- Node.js and npm, or Bun.
- A GitHub repository URL for this project.

### Installation

Clone the repository and enter the project directory:

```bash
git clone <your-repository-url>
cd order-delay-risk-assistant
```

Install dependencies:

```bash
bun install
```

Alternatively, use npm:

```bash
npm install
```

### Run Locally

Start the development server:

```bash
bun run dev
```

Or use:

```bash
npm run dev
```

Open the local URL printed in the terminal.

## Gemini API Configuration

The AI explanation feature uses the Google Gemini API through server-side code.

1. Obtain an API key through Google AI Studio.
2. In Lovable, add the key under **Project Settings → Secrets**.
3. Set the secret name to `GOOGLE_API_KEY`.
4. For local development, configure the key using a supported server-side environment mechanism.

**Security considerations**

- Never commit API keys or credentials.
- Never expose the key through browser-side environment variables such as `VITE_GOOGLE_API_KEY`.
- Keep the key in server-side secrets or environment variables.
- Restrict API usage before making the application publicly accessible.

If the AI service is unavailable or the response fails validation, the dashboard can display a sample explanation instead. The deterministic status remains unchanged.

## Testing

Run the automated test suite:

```bash
bun run test
```

Or:

```bash
npm test
```

### Verified Results

**Last verified: 19 October 2026**

- 3 test files passed.
- 18 automated tests passed.
- A live Gemini request returned an explanation labelled with the model name.
- A simulated AI-service connection failure displayed the sample fallback.
- The order status remained unchanged when the AI service failed.

These results describe the verified prototype behavior and are not a guarantee of production readiness.

## Limitations

- Uses fictional sample data for 12 orders.
- Does not connect to an ERP, inventory database, or purchase-order system.
- Uses a fixed reference date to keep sample results reproducible.
- Does not include authentication, persistent storage, or role-based access.
- AI explanations may contain errors despite response validation.
- Does not yet implement caching or comprehensive rate limiting.
- Has not been deployed as a production service.

## Future Improvements

- Integrate real inventory, order, and purchase-order data.
- Add authentication and role-based access control.
- Implement server-side rate limiting and caching.
- Add support for partial shipments and alternate-SKU suggestions.
- Provide CSV export and alerts for newly at-risk orders.
- Add end-to-end browser tests and continuous integration.

## Project Objective

This prototype demonstrates how deterministic business rules and generative AI can work together in an operations dashboard: business rules produce the decision, while AI makes the result easier to understand and act upon.
