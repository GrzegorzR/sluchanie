#!/bin/bash

# Navigate to the script's directory (web)
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR" || exit 1

echo "--- Starting Backend Server --- "
cd backend || exit 1

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Backend virtual environment 'venv' not found. Please set it up first."
    exit 1
fi

source venv/bin/activate || { echo "Failed to activate backend venv"; exit 1; }

# Trap to deactivate venv on exit
trap 'echo "Deactivating backend venv..."; deactivate' EXIT

echo "Installing/Updating backend dependencies..."
pip install -r requirements.txt || { echo "Failed to install backend requirements"; exit 1; }

# Apply database migrations
echo "Applying database migrations..."
python -m alembic upgrade head || { echo "Failed to apply migrations"; exit 1; }

# Ensure admin user exists (optional, but good practice)
# echo "Ensuring admin user exists..."
# python -m app.create_admin # Uncomment if you want this to run every time

# Run backend in the foreground
echo "Starting backend server (press Ctrl+C to stop)..."
python run.py

BACKEND_EXIT_CODE=$?
echo "Backend server stopped with exit code $BACKEND_EXIT_CODE."
exit $BACKEND_EXIT_CODE 