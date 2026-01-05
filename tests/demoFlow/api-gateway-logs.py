import json
import random
import time
import uuid
from datetime import datetime

from faker import Faker
from kafka import KafkaProducer
# --- Configuration ---
# Replace with your Kafka broker's address
KAFKA_BROKER_URL = "localhost:9092"
# The topic to which the logs will be sent
TOPIC_NAME = "api-gateway-logs"

# --- Initialization ---
fake = Faker()

# --- Log Generation ---

# Define realistic endpoints for a Fintech API
CRITICAL_ENDPOINTS = ["/v1/payments", "/v1/transfers", "/v1/payouts"]
GENERAL_ENDPOINTS = [
    "/v1/users",
    "/v1/transactions/history",
    "/v1/accounts",
    "/v1/cards",
]
ALL_ENDPOINTS = CRITICAL_ENDPOINTS + GENERAL_ENDPOINTS

# Define status codes with weights to simulate a realistic distribution
# 85% success, 10% client errors, 5% server errors
STATUS_CODES = (
    [200, 201, 204] * 17  # 85%
    + [400, 401, 403, 404] * 2  # 10%
    + [500, 502, 503]  # 5%
)


def generate_log_entry() -> dict:
    """Generates a single, realistic API log entry."""
    http_method = random.choices(
        ["POST", "GET", "PUT", "DELETE"], weights=[0.4, 0.4, 0.1, 0.1], k=1
    )[0]
    endpoint = random.choice(ALL_ENDPOINTS)
    status_code = random.choice(STATUS_CODES)

    # Simulate higher latency for failed requests or critical POSTs
    if status_code >= 500:
        response_time = random.randint(1500, 3000)
    elif http_method == "POST" and endpoint in CRITICAL_ENDPOINTS:
        response_time = random.randint(200, 1200)
    else:
        response_time = random.randint(50, 450)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_ip": fake.ipv4(),
        "http_method": http_method,
        "endpoint_path": endpoint,
        "status_code": status_code,
        "response_time_ms": response_time,
        "user_agent": fake.user_agent(),
        "request_id": str(uuid.uuid4()),
    }


# --- Main Kafka Producer Loop ---


def run_producer():
    """Runs the Kafka producer to continuously send logs."""
    print(f"Attempting to connect to Kafka broker at {KAFKA_BROKER_URL}...")
    try:
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_BROKER_URL],
            # Encode messages as JSON
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            # Configure retries for robustness
            retries=5,
            # Wait for acknowledgment from the leader replica
            acks="1",
        )
        print("Successfully connected to Kafka broker.")
    except Exception as e:
        print(f"Error connecting to Kafka: {e}")
        print("Please ensure Kafka is running and accessible.")
        return

    print(f"🚀 Starting to send logs to topic '{TOPIC_NAME}'. Press Ctrl+C to stop.")
    try:
        while True:
            log_entry = generate_log_entry()
            producer.send(TOPIC_NAME, value=log_entry)
            print(f"Sent log: {log_entry['request_id']} - {log_entry['status_code']}")

            # Wait for a random interval to simulate variable traffic
            time.sleep(random.uniform(0.1, 1.5))
    except KeyboardInterrupt:
        print("\nProducer stopped by user.")
    finally:
        print("Flushing remaining messages...")
        producer.flush()
        producer.close()
        print("Kafka producer closed.")


if __name__ == "__main__":
    run_producer()