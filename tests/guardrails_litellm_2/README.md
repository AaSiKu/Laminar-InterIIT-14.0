# Guardrails for LiteLLM + FastMCP

This project demonstrates how to implement security guardrails for an LLM agent using LiteLLM and FastMCP.

## Structure

- `requirements.py`: Setup script to install dependencies.
- `fastmcp_server.py`: A FastMCP server defining tools (some vulnerable).
- `guardrails.py`: The core security logic implementing various guardrails.
- `test_guardrails.py`: Pytest suite testing the guardrails against simulated attacks.

## Implemented Guardrails

1.  **SSRF (Server-Side Request Forgery)**: Prevents tools from accessing internal IP addresses (e.g., localhost, 169.254.169.254).
2.  **BOLA (Broken Object Level Authorization)**: Ensures users can only access their own data.
3.  **PII (Personally Identifiable Information)**: Redacts emails and phone numbers from model outputs.
4.  **Prompt Injection**: Detects and blocks adversarial prompts (e.g., "Ignore previous instructions").
5.  **Rate Limiting**: Limits the number of requests a user can make within a time window.
6.  **POLP (Principle of Least Privilege)**: Restricts tool access based on user roles (e.g., only admins can read files).
7.  **Loop Detection**: Prevents infinite loops of identical tool calls.

## Setup

1.  Run the setup script to create a virtual environment and install dependencies:
    ```bash
    python3 requirements.py
    ```

2.  Activate the virtual environment:
    ```bash
    source venv/bin/activate
    ```

3.  (Optional) Set your Gemini API key if you want to extend the tests to use a real model:
    ```bash
    export GEMINI_API_KEY=your_key_here
    ```

## Running Tests

Run the tests using pytest:

```bash
pytest test_guardrails.py
```

## Usage

The `GuardrailManager` class in `guardrails.py` can be integrated into your LiteLLM agent loop. It provides hooks:
- `pre_call_hook`: Check prompt injection, rate limits.
- `tool_call_hook`: Check SSRF, BOLA, POLP, Loops.
- `post_call_hook`: Redact PII.

Example:

```python
gm = GuardrailManager()
gm.pre_call_hook(user_id, prompt)
# ... call LLM ...
gm.tool_call_hook(user_id, tool_name, args)
# ... execute tool ...
response = gm.post_call_hook(response)
```
