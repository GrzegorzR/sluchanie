#!/bin/bash

# Navigate to the script's directory (web)
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR" || exit 1

echo "--- Starting Frontend Server --- "
cd frontend || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Frontend dependencies ('node_modules') not found. Please run 'npm install' first."
    exit 1
fi

# Run frontend in the foreground
echo "Starting frontend server (press Ctrl+C to stop)..."
npm start

FRONTEND_EXIT_CODE=$?
echo "Frontend server stopped with exit code $FRONTEND_EXIT_CODE."
exit $FRONTEND_EXIT_CODE 