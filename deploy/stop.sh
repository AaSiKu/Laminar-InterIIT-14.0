#!/bin/bash

# --- Configuration ---
# Directory where PIDs are stored
PID_DIR="deploy/pids"

# ---------------------

echo "Stopping servers..."

# Check if the PID directory exists
if [ ! -d "$PID_DIR" ]; then
    echo "PID directory '$PID_DIR' not found. Nothing to stop."
    exit 0
fi

# Find all .pid files in the directory
for pid_file in "$PID_DIR"/*.pid; do
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if [ -n "$pid" ]; then
            echo "Stopping process with PID $pid from file $pid_file..."
            # Kill the process; the '-' before the PID kills the entire process group
            # Use `kill` and check if it exists first with `ps -p`
            if ps -p $pid > /dev/null; then
               kill -9 "$pid"
               echo "Process $pid stopped."
            else
               echo "Process $pid was not running."
            fi
            # Remove the PID file
            rm "$pid_file"
        else
            echo "Warning: PID file '$pid_file' is empty."
        fi
    fi
done

echo "All specified processes have been stopped."
