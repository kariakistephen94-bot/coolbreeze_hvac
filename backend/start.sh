#!/usr/bin/env bash
# ==============================================================================
# CoolBreeze Backend Startup Script
# ==============================================================================

set -e

# Resolve the backend directory regardless of where this script is called from
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

# Configuration options (can be overridden via environment variables)
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

echo "=================================================="
echo " Starting CoolBreeze Backend API"
echo "=================================================="
echo "Directory : $BACKEND_DIR"
echo "Host      : $HOST"
echo "Port      : $PORT"
echo "API Docs  : http://${HOST}:${PORT}/docs"
echo "=================================================="

# Ensure ~/.local/bin and ~/.cargo/bin are in PATH if available
if [ -d "$HOME/.local/bin" ]; then
    export PATH="$HOME/.local/bin:$PATH"
fi
if [ -d "$HOME/.cargo/bin" ]; then
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Detect execution method: prefer uv if available, fallback to .venv or python
if command -v uv >/dev/null 2>&1; then
    echo "Running via uv..."
    exec uv run uvicorn app:app --app-dir src --host "$HOST" --port "$PORT" --reload "$@"
elif [ -f "$BACKEND_DIR/.venv/bin/uvicorn" ]; then
    echo "Running via .venv/bin/uvicorn..."
    exec "$BACKEND_DIR/.venv/bin/uvicorn" app:app --app-dir src --host "$HOST" --port "$PORT" --reload "$@"
elif [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    echo "Running via .venv/bin/python -m uvicorn..."
    exec "$BACKEND_DIR/.venv/bin/python" -m uvicorn app:app --app-dir src --host "$HOST" --port "$PORT" --reload "$@"
elif command -v uvicorn >/dev/null 2>&1; then
    echo "Running via system uvicorn..."
    exec uvicorn app:app --app-dir src --host "$HOST" --port "$PORT" --reload "$@"
else
    echo "Error: Neither uv, .venv, nor uvicorn was found." >&2
    echo "Please ensure the virtual environment is set up (e.g., 'uv sync')." >&2
    exit 1
fi
