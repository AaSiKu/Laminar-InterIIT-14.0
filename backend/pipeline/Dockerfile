# Use a lightweight Python base image
FROM python:3.12-slim

RUN pip install uv

# Set working directory inside container
WORKDIR /app

# Copy project dependencies
COPY constraints.txt .
COPY requirements_freeze.txt .

RUN uv pip install -r requirements_freeze.txt --constraint constraints.txt --system

COPY requirements.txt .

RUN uv pip install -r requirements.txt --system



EXPOSE 8000
# Create log file and run both tail and server

CMD ["uvicorn", "pipeline.server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
