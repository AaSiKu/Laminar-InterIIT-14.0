# laminar

#### Local Setup

This project includes a comprehensive setup script to get your local development environment running with a single command.

**Prerequisites:**
-   Python 3.x
-   `npm` (Node Package Manager)
-   Docker

**env**
1. **Get the required keys**
   The applications have 4 env files for different services
   ```
   /backend/api
   /backend/pipeline
   /rag
   /frontend
   ```
   Each folder have its respective template, please ensure set up the env variables correctly.

**Instructions:**

1.  **Make the script executable:**
    If you're on macOS or Linux, you'll need to give the setup script execution permissions. If you are on Windows, please use WSL or a Git Bash terminal.
    ```bash
    chmod +x deploy/localSetup.sh
    ```

2.  **Run the setup script:**
    ```bash
    ./deploy/localSetup.sh
    ```

**What the script does:**
-   Creates and activates a Python virtual environment in `venv/`.
-   Installs all required Python packages from `requirements.txt`.
-   Installs all required Node.js packages for the frontend.
-   Starts three background services:
    -   **API Server** on port `8081`.
    -   **RAG Server** on port `8082`.
    -   **Frontend Dev Server** on port `5173`.
-   Saves the Process IDs (PIDs) of all services to the `deploy/pids/` directory.

All logs for the running services can be found in the `logs/` directory.

#### Stopping the Services

To stop all background services at once, simply run the provided stop script:

```bash
./deploy/stop.sh
```