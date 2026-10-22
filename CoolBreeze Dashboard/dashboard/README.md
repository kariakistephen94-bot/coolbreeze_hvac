# CoolBreeze lead desk

A restrained, responsive HVAC operations demo built with Next.js App Router, TypeScript, Tailwind CSS 4, Lucide icons, and Zod. No production credentials or backend were available. Every screen labels sample data clearly.

## Run

Requires Node.js 20.9 or later.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` produces a static export in `out/`. `npm test` validates data, filters, metrics, timezone handling, and adapter failures. `npm run typecheck` checks TypeScript.

## Features

- Overview: period filter, computed lead count, average response excluding unanswered leads, booked lead count and conversion rate, recent leads, upcoming appointments, and illustrative workflow health.
- Leads: search across customer, email, service, city and ID; status and priority filters; accessible native modal with contact information and conversation history.
- Conversations: searchable read-only email histories.
- Appointments: navigable seven-day calendar, customer/service/technician details, notification status, timezone-aware times.
- Automations: expandable intake, AI email, calendar booking and notification workflows. Status is illustrative, not a live service check.
- Settings: explicit connection state and confirmed reset of browser-local demo changes.

The demo clock is fixed to October 17, 2026. All appointments use IANA `America/Chicago`, including DST; host locale does not change displayed times. Status and priority changes are persisted in localStorage. Changing lead status does not create, cancel, or reschedule appointments. No emails, workflow executions, retry requests, or bookings are sent.

## Integration boundary

`lib/data.ts` defines runtime-validated Lead, Booking, and Snapshot contracts. `lib/adapter.ts` provides `DashboardAdapter`, `DemoAdapter`, and an opt-in `HttpAdapter(endpoint, getToken)` with a timeout and strict response validation. The UI deliberately instantiates only DemoAdapter.

To connect a real FastAPI/Supabase backend:

1. Confirm the actual existing API routes, schema, and auth flow. No endpoint was assumed or invented here.
2. Map your authenticated read response into the Snapshot contract; obtain tokens through your existing session flow. Never embed Supabase service-role keys or server secrets in browser code.
3. Replace DemoAdapter initialization with the authenticated adapter. Add loading/error/retry UI, remove browser fixture persistence, replace the fixed demo clock with current time, and derive workflow health from real run records.
4. Implement permission-checked mutations through the existing API. Status/priority edits currently modify only local fixtures, so they must be wired separately. Calendar booking and notification actions are intentionally unavailable.
5. Apply existing row-level access policies in Supabase and validate authorization server-side. If using an API proxy, remove static export and host Next.js with a server runtime. If calling the backend directly, configure its CORS policy for the deployment origin.

## Structure

- `app/`: root layout, overview, statically generated section routes, shared design tokens and responsive styling.
- `components/dashboard.tsx`: workspace shell, views, filters, accessible detail dialog, browser-local state.
- `lib/data.ts`: typed fixtures, timezone formatting, pure selectors and metrics.
- `lib/adapter.ts`: data-source interface and validated HTTP adapter.
- `lib/data.test.ts`: meaningful behavior and contract tests.

The static export contains synthetic names and reserved example.com email addresses only. No live customer data is included.
