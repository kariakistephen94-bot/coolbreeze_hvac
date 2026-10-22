#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=============================================="
echo "  Starting CoolBreeze Lead Desk Dashboard"
echo "=============================================="

if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found in $DIR"
  echo "   Please create .env with your Supabase credentials."
else
  echo "✓ Supabase configuration (.env) detected."
fi

if [ ! -d "node_modules" ]; then
  echo "Installing node dependencies..."
  npm install
fi

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"

# Check if port is already occupied and inform user
OCCUPIED_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$OCCUPIED_PID" ]; then
  echo "Port $PORT is currently occupied by PID: $OCCUPIED_PID"
  echo "Stopping previous process on port $PORT..."
  kill -9 $OCCUPIED_PID 2>/dev/null || true
  sleep 1
fi

echo "Cleaning stale Next.js cache (.next)..."
rm -rf .next

echo "Launching Next.js server on http://$HOST:$PORT ..."
exec npx next dev --hostname "$HOST" --port "$PORT"
