#!/bin/bash

# --- Configuration ---
# Set the name of the virtual environment directory
VENV_DIR="venv"

# Set the path to your requirements file
REQS_FILE="requirements.txt"

# Server ports
API_SERVR_PORT=8081

# ---------------------

# Stop the script if any command fails
set -e

## 1. Check for Python 3
echo "Checking for Python 3..."
if ! command -v python3 &> /dev/null; then
    # 2. Error and Exit if not found
    echo "Error: python3 is not installed. Please install it to continue." >&2
    exit 1
fi

echo "Python 3 found."

## 3. Create Virtual Environment
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in './$VENV_DIR'..."
    python3 -m venv $VENV_DIR
else
    echo "Virtual environment './$VENV_DIR' already exists. Skipping creation."
fi

## 4. Activate Venv and Install Requirements
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

if [ -f "$REQS_FILE" ]; then
    echo "Installing requirements from $REQS_FILE..."
    pip install -r $REQS_FILE &> /dev/null
    echo "Requirements installed."
else
    echo "Warning: '$REQS_FILE' not found. Skipping dependency installation."
fi

### 5. Start FastAPI Server in Background
echo "---"
echo "Starting FastAPI server in background..."

# Create the logs directory if it doesn't exist
mkdir -p logs

# Use nohup to keep the server running after the script exits.
# Redirect stdout (>) and stderr (2>&1) to a log file.
# Run in the background (&).
nohup uvicorn backend.api.main:app --port $API_SERVR_PORT --reload > logs/api.log 2>&1 &

# Print the Process ID (PID) of the background job
echo "Server started with PID: $!"
echo "Logs are being written to: logs/api.log"
echo "You can monitor the logs with: tail -f logs/api.log"

echo "---"
echo "Setup script finished."