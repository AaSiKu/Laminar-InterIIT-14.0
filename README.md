# laminar

#### Local Setup

This project includes a comprehensive setup script to get your local development environment running with a single command.

**Prerequisites:**
-   Python 3.x
-   `npm` (Node Package Manager) (Node v22.11.0 and npm v10.8.0)
-   Docker

**env**
1. **Get the required keys**
   The applications have 4 env files for different services
   ```
   /backend/api
   /backend/pipeline
   /backend/agentic
   /frontend
   ```
   Each folder have its respective template, please ensure set up the env variables correctly.

### Build docker images for dynamic spin up
1. **Navigate to backend/**
    `cd backend/`
2. **Build images**
   `docker compose build`
**Instructions:**

1.  **Make the script executable:**
    If you're on macOS or Linux, you'll need to give the setup script execution permissions. If you are on Windows, please use WSL or a Git Bash terminal.
    ```bash
    chmod +x deploy/localSetup.sh
    ```

2.  **Run the setup script:**
    ```bash
    ./scripts/local_setup.sh
    ```

**What the script does:**
-   Creates and activates a Python virtual environment in `backend/api_venv/`.
-   Installs all required Python packages from `backend/api/requirements.txt` into the above venv.
-   Installs all required Node.js packages for the frontend.
-   Starts three background services:
    -   **API Server** on port `8081`.
    -   **Frontend Dev Server** on port `8083`.
-   Saves the Process IDs (PIDs) of all services to the `deploy/pids/` directory.

All logs for the running services can be found in the `deploy/logs/` directory.

#### Stopping the Services

To stop all background services at once, simply run the provided stop script:

```bash
./scripts/stop.sh
```