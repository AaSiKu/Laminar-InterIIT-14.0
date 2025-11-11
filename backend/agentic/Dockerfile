# Use a lightweight Python base image
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Copy project dependencies
COPY ./agentic/requirements.txt /app/requirements.txt

# Install Python dependencies (if file exists)
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code
COPY ./lib /app/lib
COPY ./agentic /app/agentic
COPY ./postgres_util.py /app/postgres_util.py


RUN mv /app/agentic/.env /app/.env


EXPOSE 5333
# Default command to run FastAPI server
CMD ["python3", "-m", "agentic"]
