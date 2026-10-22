# CoolBreeze Backend API

FastAPI backend service for lead capture, Supabase database integration, and n8n webhook notifications.

## Quick Start

Run the startup script from anywhere:

```bash
# From within the backend directory:
./start.sh

# Or from the project root:
./backend/start.sh
```

The script will automatically detect `uv` or your `.venv` virtual environment and launch Uvicorn with hot reload enabled.

- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive API Docs (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

## Configuration

You can override default host and port using environment variables:

```bash
PORT=8080 HOST=0.0.0.0 ./start.sh
```

## Environment Variables

Ensure `backend/.env` has the required configuration:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
