#!/bin/bash

# --- Configuration ---
# Set the name of the virtual environment directory
VENV_DIR="venv"
PID_DIR="deploy/pids"
LOG_DIR="deploy/logs"

# Set the path to your requirements file
REQS_FILE="requirements.txt"
PIPELINE_IMAGE_NAME="pathway_pipeline"

# Server ports
API_SERVER_PORT=8081
RAG_SERVER_PORT=8082
FRONTEND_PORT=8083

# ---------------------

# Stop the script if any command fails
set -e

# Create the PID directory if it doesn't exist
mkdir -p $PID_DIR
mkdir -p $LOG_DIR

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
    pip install -r $REQS_FILE > $LOG_DIR/pip.log 
    echo "Requirements installed."
else
    echo "Warning: '$REQS_FILE' not found. Skipping dependency installation."
fi

# Create the logs directory if it doesn't exist
mkdir -p logs

# Check if Docker daemon is running and the required image exist
if ! docker version > /dev/null 2>&1; then
    echo "Error: Docker daemon is not running."
    exit 1
fi
echo "Docker daemon is up and running."

if [ -z "$(docker images -q "$PIPELINE_IMAGE_NAME" 2> /dev/null)" ]; then
    echo "Image '$PIPELINE_IMAGE_NAME' does not exist locally."
    exit 1
fi
echo "Image '$PIPELINE_IMAGE_NAME' exists locally."

### 5. Start FastAPI Server in Background
echo "---"
echo "Starting FastAPI servers in background..."

# Use nohup to keep the server running after the script exits.
# Redirect stdout (>) and stderr (2>&1) to a log file.
# Run in the background (&).
nohup uvicorn backend.api.main:app --port $API_SERVER_PORT --reload > $LOG_DIR/api.log 2>&1 &
API_PID=$!
echo $API_PID > "$PID_DIR/api.pid"

# Print the Process ID (PID) of the background job
echo "API Server started with PID: $API_PID"
echo "You can monitor the logs with: tail -f $LOG_DIR/api.log"

echo "---"

### 6. Start RAG Server in Background
echo "Starting RAG server in background..."

nohup uvicorn rag.main:app --port $RAG_SERVER_PORT --reload > $LOG_DIR/rag.log 2>&1 &
RAG_PID=$!
echo $RAG_PID > "$PID_DIR/rag.pid"

# Print the Process ID (PID) of the background job
echo "RAG Server started with PID: $RAG_PID"
echo "You can monitor the logs with: tail -f $LOG_DIR/rag.log"

echo "---"

### 7. Start Frontend
echo "Starting frontend..."
cd frontend
echo "Installing npm packages..."
npm install > ../$LOG_DIR/frontend.log

echo "Starting frontend dev server..."
# The --port option for Vite is passed directly
nohup npm run dev -- --port $FRONTEND_PORT > ../$LOG_DIR/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "../$PID_DIR/frontend.pid"
cd ..

# Print the Process ID (PID) of the background job
echo "Frontend started with PID: $FRONTEND_PID"
echo "You can monitor the logs with: tail -f $LOG_DIR/frontend.log"

echo "---"

echo "Setup script finished."
echo "To stop all services, run: ./deploy/stop.sh"