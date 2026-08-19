#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "Starting StackChat Backend API (logging to backend.log)..."
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "Starting StackChat Frontend (logging to frontend.log)..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

echo "=================================================="
echo "StackChat is running!"
echo "Backend API: http://localhost:8000"
echo "Frontend UI: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
echo "=================================================="

# Trap Ctrl+C (SIGINT) to cleanly shut down both servers
trap "echo -e '\nStopping StackChat servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'; exit" SIGINT SIGTERM

# Wait indefinitely until interrupted
wait
