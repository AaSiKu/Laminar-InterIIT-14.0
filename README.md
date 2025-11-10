# laminar

#### Local Setup

This project includes a comprehensive setup script to get your local development environment running with a single command.

**Prerequisites:**
-   Python 3.x
-   `npm` (Node Package Manager) (Node v22.11.0 and npm v10.8.0)
-   Docker
-   Kafka setup on localhost:9092 and host.docker.internal:9094. Right now these setup instructions don't include authentication.
-   Modify your kafka `server.properties` 
    ```
    listeners=CONTROLLER://:9093,PLAINTEXT://:9092,PIPELINE://:9094
¯
    # Name of listener used for communication between brokers.
    inter.broker.listener.name=PLAINTEXT

    # Listener name, hostname and port the broker or the controller will advertise to clients.
    # If not set, it uses the value for "listeners".
    advertised.listeners=CONTROLLER://localhost:9093,PLAINTEXT://localhost:9092,PIPELINE://host.docker.internal:9094

    # A comma-separated list of the names of the listeners used by the controller.
    # If no explicit mapping set in `listener.security.protocol.map`, default will be using PLAINTEXT protocol
    # This is required if running in KRaft mode.
    controller.listener.names=CONTROLLER

    # Maps listener names to security protocols, the default is for them to be the same. See the config documentation for more details
    listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL,SASL_PLAINTEXT:SASL_PLAINTEXT,SASL_SSL:SASL_SSL,PIPELINE:PLAINTEXT
    ```
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
    chmod +x deploy/local_setup.sh
    chmod +x deploy/local_stop.sh
    chmod +x deploy/clean_up.sh
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
./scripts/local_stop.sh
```

Also run 
`./scripts/clean_up.sh <PIPELINE_ID>` to cleanly remove the docker containers and network associated with the pipeline id