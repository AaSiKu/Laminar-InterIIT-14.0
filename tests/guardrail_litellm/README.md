# Guardrails with LiteLLM and FastMCP

This project demonstrates how to implement security guardrails for LLM applications using LiteLLM and FastMCP. It covers protection against common vulnerabilities like SSRF, BOLA, PII leakage, Prompt Injection, Rate Limiting, POLP, and Loop Detection.

## Setup

1.  **Install Dependencies**:
    You can run the provided python script:
    ```bash
    python requirements.py
    ```
    Or install from requirements.txt:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Environment Variables**:
    Create a `.env` file in this directory with your Gemini API key (if running real model tests, though tests are mocked by default):
    ```
    GEMINI_API_KEY=your_api_key_here
    ```

## Running the MCP Server

The `server.py` file contains a FastMCP server with some vulnerable tools for demonstration purposes.

```bash
python server.py
```

## Running the Agent (Interactive)

To see the guardrails in action with a real model (requires API key):

```bash
python run_agent.py
```

## Running Tests

The tests in `test_guardrails.py` verify that the guardrails correctly block malicious attempts.

```bash
pytest test_guardrails.py
```

## Guardrails Implemented

1.  **SSRF (Server-Side Request Forgery)**: Blocks access to sensitive files (e.g., `/etc/passwd`) and internal IPs in `read_file` tool calls.
2.  **BOLA (Broken Object Level Authorization)**: Ensures users can only access their own data in `get_user_data` tool calls.
3.  **PII (Personally Identifiable Information)**: Redacts emails, phone numbers, SSNs, and credit card numbers from model outputs.
4.  **Prompt Injection**: Detects and blocks known injection keywords in user input.
5.  **Rate Limiting**: Limits the number of requests per user within a time window.
6.  **POLP (Principle of Least Privilege)**: Restricts access to dangerous tools (like `system_tool`) based on user roles.
7.  **Loop Detection**: Detects and blocks repetitive conversation loops.

## Architecture

-   `guardrails.py`: Contains the `SecurityGuardrails` class and `secure_completion` wrapper.
-   `server.py`: A FastMCP server exposing tools.
-   `test_guardrails.py`: Pytest suite covering all attack vectors.
