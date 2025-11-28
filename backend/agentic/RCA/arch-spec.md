### 1. Architectural Requirements

You must implement a stateful graph (`StateGraph`) with the following specific nodes/agents:

- **Node A: The Context Builder (GALA Inspiration)**

  - _Function:_ This is a deterministic python function (not an LLM) that acts as the entry point.
  - _Task:_ It generates a "Diagnostic Bundle." It must simulate fetching:
    1.  **Service Dependency Subgraph:** A list of services involved in the trace (e.g., `Kafka -> Consumer -> Database`).
    2.  **Temporal Performance Profile:** A summary of metrics (e.g., "Consumer Lag > 5000ms" or "CPU > 90%").
    3.  **Error-Centric Log Abstraction:** A set of de-duplicated unique error signatures from the logs.
  - _Note:_ Mock the data fetching functions for now, but strictly define the data structure.

- **Node B: The Retrieval Agent (MA-RCA Inspiration)**

  - _Role:_ "The Historian."
  - _Task:_ Before analysis, it queries a (mocked) vector database for "Historical Incidents" similar to the current symptoms.
  - _Output:_ Adds `similar_past_cases` to the state.

- **Node C: The Analysis Agent (The "Deep Dive")**

  - _Role:_ "The Brain."
  - _Task:_ It reviews the _Diagnostic Bundle_ and _Historical Cases_. It uses Chain-of-Thought to generate a `RootCauseHypothesis`.
  - _Critical Logic:_ It must NOT guess. It must output a specific hypothesis (e.g., "Docker container OOM Killed") and a _Verification Command_ (e.g., "Inspect docker exit code").

- **Node D: The Validation Agent (MA-RCA Inspiration)**

  - _Role:_ "The Tester."
  - _Task:_ It takes the _Verification Command_ from the Analyst and executes a specific Tool.
  - _Tools:_ Implement mock tools using the `@tool` decorator:
    1.  `verify_docker_state(container_id)`: Returns exit codes/status.
    2.  `check_kafka_lag(group_id)`: Returns current offset lag.
  - _Goal:_ It actively validates if the hypothesis is true or false.

- **Node E: The Supervisor (Orchestrator)**
  - _Task:_ Evaluates the output of the Validation Agent. If the hypothesis is confirmed, it routes to `End`. If rejected, it loops back to `Analysis Agent` to form a new hypothesis.

### 2. Implementation Details

- **Library:** Use `langgraph`, `langchain_core`, and `pydantic`.
- **State Management:** Define a `TypedDict` named `RCAState` containing: `trace_id`, `diagnostic_bundle` (dict), `hypothesis` (str), `validation_result` (bool), and `messages` (list).
- **Output:** Provide the full Python code in a single block, including the `StateGraph` compilation and a `__main__` block that runs a simulated alert scenario (e.g., a Kafka Consumer lag issue caused by a Docker crash).

### 3. Style Guidelines

- Use Python 3.11+ type hinting.
- Add docstrings explaining which paper influenced which component (e.g., "Diagnostic Bundle inspired by GALA").
- Ensure the code is runnable (use mock return values for external APIs).

### 4. Demonstration

In a "Linear" script, you check `Step 1 -> Step 2 -> Step 3` in order.
In this "Non-Linear" code, the agent **loops back** and changes its strategy based on what it finds.

### The Scenario: "The Partial Failure"

Imagine a simple data split workflow:

1.  **Input:** A Kafka Topic (`Orders`).
2.  **Processor:** A Docker Container (`Splitter`) that separates orders by region.
3.  **Outputs:** Two Postgres Tables: `US_Orders` and `EU_Orders`.

**The Incident:** `US_Orders` is full of data. `EU_Orders` is empty. The Docker container is **Running** (green).

---

### Execution Trace (How the Code Handles It)

Here is how the functions in the code interact to solve this non-linearly.

#### 1. Context Builder (`context_builder_node`)

- **Action:** Fetches the snapshot.
- **Result (Diagnostic Bundle):**
  - `temporal_performance_profile`: "US_Orders: 50 rows/sec. **EU_Orders: 0 rows/sec**."
  - `error_log_abstraction`: "No CRITICAL errors."
- **Observation:** The linear approach of "Check for Critical Errors" fails here because the system thinks it's healthy.

#### 2. Iteration 1: The Initial check (`analysis_agent_node`)

- **Agent Logic:** "One table works, one doesn't. Is the `EU_Orders` table actually empty, or is the metric wrong?"
- **Hypothesis:** "Verify the final table state."
- **Tool Call:** `query_postgres_node_output(table_name="EU_Orders")`

#### 3. Validation 1 (`validation_agent_node`)

- **Action:** Runs SQL `SELECT COUNT(*) FROM "EU_Orders"`.
- **Result:** `0`.
- **Supervisor (`supervisor_edge`):** "Okay, the table is empty. But **why**? We haven't found the root cause yet. **Loop back.**"

#### 4. Iteration 2: The Pivot (`analysis_agent_node`)

- **New Reasoning:** "The table is definitely empty. But the `US_Orders` table is filling up, so the `Input` (Kafka) must be fine. The Docker container is 'Running', so it hasn't crashed. The problem must be **inside** the application logic for the EU branch."
- **Hypothesis:** "Check the logs specifically for _Warnings_ (not Errors) related to EU processing."
- **Tool Call:** `verify_docker_state(component="Splitter")` (The agent expects to read the `DockerError` or logs from the tool).

#### 5. Validation 2 (`validation_agent_node`)

- **Action:** Checks Docker.
- **Result:** "Status: Running. Logs: **WARN: Schema Mismatch for EU_Orders - Dropping Record**."

#### 6. Final Decision (`supervisor_edge`)

- **Supervisor:** "We found a specific error message ('Schema Mismatch') that explains why the status is Running but the data is missing. **Root Cause Confirmed. END.**"

---

### Why is this Non-Linear?

A **Linear** script would have done this:

1.  Check Docker Status -> "Running" -> **Report: System Healthy.** (FALSE NEGATIVE)
2.  Check Kafka Input -> "Has Data" -> **Report: System Healthy.** (FALSE NEGATIVE)

Your **Non-Linear Agent** did this:

1.  Checked Output B.
2.  Realized Output B was broken but Output A was fine.
3.  **Inferred** that the Input and Docker uptime were irrelevant.
4.  **Zoomed in** on the logs specifically for the breakage.

The **Supervisor Node** in your code (Line 328) enables this by returning `"continue"` instead of `"end"`, forcing the `AnalysisAgent` to try a new angle.
