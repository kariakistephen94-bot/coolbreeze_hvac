# CoolBreeze Heating & Air

CoolBreeze connects an HVAC service-request website to a lead-capture API, Supabase storage, an n8n automation webhook, and an operations dashboard. Customers request service online; staff review leads, conversations, and appointments in the lead desk.

## Video demo

[Watch the CoolBreeze demo on YouTube](https://youtu.be/FJl_vAcrMOs?si=DlKw2A0nflI6MZOe)

## How the system works

```text
Customer service-request form (HTML / CSS / JavaScript)
    |
    | POST /api/lead-capture
    v
FastAPI backend -----> Supabase: leads
    |
    | lead.created webhook + X-Webhook-Secret
    v
n8n workflow (configured separately)
    |
    | Workflow-produced messages and events stored in Supabase
    v
Next.js lead desk <---- Supabase: leads, lead_messages, lead_events
```

1. The customer enters contact information, service type, ZIP code, a description, and a preferred timeframe on the main website.
2. The browser validates the form and sends it to `http://127.0.0.1:8000/api/lead-capture`.
3. FastAPI validates and normalizes the request, including US phone numbers, service names, and urgency. It inserts the lead through the Supabase REST API.
4. After saving, the backend calls the configured n8n webhook with the lead details and a shared secret header. Email responses, scheduling, and other follow-up behavior depend on the external workflow configuration; workflow exports are not included here.
5. The dashboard requests `/api/dashboard` from its own Next.js server. That server reads Supabase records, maps them into dashboard data, and derives conversation histories, response metrics, and appointment information. It can also reconcile lead status from booking or cancellation messages.
6. The dashboard refreshes every 15 seconds. Status and priority edits use `PATCH /api/leads/[id]` and update Supabase when live data is available.

A webhook failure does not undo a saved lead. The capture response reports `automation_status: "pending_retry"`; the backend does not implement an automatic retry worker.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `script.js` | Customer-facing HVAC website and request form |
| `backend/` | Python FastAPI service, validation, Supabase insert, and n8n webhook client |
| `CoolBreeze Dashboard/dashboard/` | Next.js, React, TypeScript, and Tailwind lead desk |
| `HVAC Lead Response Demo.png` | Demo image |
| `solar-companies/` | Separate Helio solar website concept; its form is a local preview and is not connected to the HVAC backend |

## Requirements

- Python 3.12 or later and `uv` for the backend.
- Node.js 20.9 or later and npm for the dashboard.
- A Supabase project with the application's tables and appropriate access policies.
- A configured n8n webhook for automated follow-up.

Database migrations and n8n workflow exports are not supplied. A fresh Supabase project needs its schema provisioned before live use. Lead capture inserts `full_name`, `phone`, `email`, `service`, `description`, `needed_when`, and `zip_code` into `leads`, and expects the saved record to include `id` and `status`. The dashboard also reads `lead_messages` and `lead_events`; see `lib/supabaseServer.ts` inside the dashboard for the record mapping.

## Run locally

Run the following services in separate terminals, starting from the project root.

### 1. Configure and start the backend

Create `backend/.env` with your own values:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_KEY
N8N_WEBHOOK_URL=https://YOUR_N8N_HOST/webhook/YOUR_WEBHOOK
N8N_WEBHOOK_SECRET=YOUR_SHARED_SECRET
```

```bash
cd backend
uv sync
./start.sh
```

The API runs at <http://127.0.0.1:8000>. Open <http://127.0.0.1:8000/docs> to inspect and try the API. The startup script supports `HOST` and `PORT` overrides and an existing `.venv` as a fallback to `uv`.

### 2. Serve the customer website

From the project root:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Open <http://127.0.0.1:8080>. The form currently targets port 8000 explicitly in `script.js`; update that URL if you change the API address.

This development server serves the entire project directory. Keep it bound to localhost and use a dedicated public directory or web host for deployment.

### 3. Configure and start the dashboard

Create `CoolBreeze Dashboard/dashboard/.env.local`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_KEY
```

Use the same Supabase project as the backend. These variables are read by the Next.js server; never give a service-role key a `NEXT_PUBLIC_` prefix or commit environment files.

```bash
cd "CoolBreeze Dashboard/dashboard"
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. Restart the server after changing environment variables. Check any existing `.env` files for conflicting configuration.

The current dashboard uses server API routes and needs a Next.js server runtime. For a production build:

```bash
npm run build
npx next start --hostname 127.0.0.1
```

## Using CoolBreeze

### Submit a service request

1. Open the customer website and navigate to its request form.
2. Enter a name, valid US phone number, email, service, ZIP code, and a description of 10–2,000 characters.
3. Select a timeframe and submit. A successful submission saves the lead and attempts the n8n webhook.
4. Open the lead desk and wait for its next refresh to see the record.

Accepted API services are `AC_REPAIR`, `HEATING_REPAIR`, `HVAC_INSTALLATION`, `MAINTENANCE`, and `OTHER`. Accepted urgency values are `ASAP`, `TODAY`, `TOMORROW`, `THIS_WEEK`, and `FLEXIBLE`.

Known form mismatch: the website's “Within This Week” option sends a value the backend currently rejects. Use another timeframe in the form or send `THIS_WEEK` through the API until the mapping is corrected. The browser also sends consent fields that the current backend model does not persist.

### Use the lead desk

| View | What you can do |
| --- | --- |
| Overview | Review lead totals, response metrics, recent leads, and upcoming appointments; filter by period |
| Leads | Search and filter records, open lead details, and change status or priority |
| Conversations | Search and read recorded customer communications |
| Appointments | Navigate the weekly calendar and inspect booking details |
| Automations | Inspect workflow descriptions and displayed workflow information |
| Settings | Review connection information and available demo controls |

If the initial live-data request fails, the dashboard displays sample data with a notice. Edits in sample mode affect browser state rather than Supabase. A populated dashboard alone does not prove the database is connected; check the connection notice. Workflow displays are not proof that an external n8n run, email, or calendar booking succeeded.

Appointment information is derived from stored events and messages, with fallback interpretation of confirmation text. Verify important booking details against the actual scheduling system. Changing a lead status alone does not create or cancel a calendar appointment.

## API example

With the backend running, this creates a real lead in the configured database and attempts the configured webhook:

```bash
curl -X POST http://127.0.0.1:8000/api/lead-capture \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Demo Customer",
    "phone": "2145550199",
    "email": "demo@example.com",
    "service": "AC_REPAIR",
    "description": "The air conditioner is running but blowing warm air.",
    "zip_code": "75204",
    "needed_when": "THIS_WEEK"
  }'
```

A successful response includes `message`, `lead_id`, `status`, and `automation_status` (`triggered` or `pending_retry`).

## Checks and troubleshooting

Run the dashboard's existing checks from its directory:

```bash
npm test
npm run typecheck
npm run build
```

- **Form cannot connect:** confirm the API is running at the address hardcoded in `script.js`.
- **Lead capture fails:** check backend logs, Supabase credentials, and the `leads` schema. Validation failures return field details or a validation message.
- **Lead saved but automation did not run:** inspect `automation_status`, the n8n URL, matching `X-Webhook-Secret`, and n8n execution logs. `triggered` means the webhook returned a successful JSON response; downstream workflow completion must be checked separately.
- **Dashboard shows samples or cannot sync:** check the Next.js server logs, environment configuration, Supabase tables, and permissions.
- **Conversations or bookings are missing:** confirm the external workflows write the expected messages and events to the same Supabase project.

## Deployment considerations

This repository is a development/demo application. The current API routes do not implement user authentication or staff authorization, and the backend allows all CORS origins. Add access controls and restrict CORS before exposing customer records or server-key-backed dashboard routes publicly. Keep all environment files and service-role keys private. Use HTTPS and configure the website's API URL for the deployed backend.
