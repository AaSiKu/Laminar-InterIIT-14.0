# Use a lightweight Python base image
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Copy project dependencies
COPY ./pipeline/requirements.txt /app/requirements.txt

# Install Python dependencies (if file exists)
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code
COPY ./lib /app/lib
COPY ./pipeline /app/pipeline
COPY ./postgres_util.py /app/postgres_util.py

# Move server.py to root of /app
RUN mv /app/pipeline/server.py /app/server.py

RUN mv /app/pipeline/.env /app/.env


EXPOSE 8000
# Create log file and run both tail and server
CMD ["sh", "-c", "touch pipeline.log && tail -f pipeline.log & python3 server.py"]
