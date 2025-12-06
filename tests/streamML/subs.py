import pathway as pw
import time
import threading
import queue
import os
import asyncio
from typing import Dict, Any


class OutputSchema(pw.Schema):
        value: int
        gen_ts: float
class ProcessingTransformer(pw.AsyncTransformer, output_schema=OutputSchema):
    async def invoke(self, value: int, gen_ts: float) -> Dict[str, Any]:
        # Simulate processing
        await asyncio.sleep(1)
        return {
            "value": value,
            "gen_ts": gen_ts
        }

# 1. Stream Generator Class
class LatencyTestSubject(pw.io.python.ConnectorSubject):
    def __init__(self, delta: float = 0.1, count: int = 100):
        super().__init__()
        self.delta = delta
        self.count = count

    def run(self):
        print(f"Starting stream generation (delta={self.delta}, count={self.count})...")
        for i in range(self.count):
            time.sleep(self.delta)
            self.next(value=i, gen_ts=time.time())
        print("Stream generation finished.")
        self.close()

# Queue to store received values
q = queue.Queue()

# 3. Subscribe function
def on_change(key, row, time, is_addition):
    if is_addition:
        q.put(row)

def test_latency():
    delta = 0.01
    count = 1000
    
    subject = LatencyTestSubject(delta=delta, count=count)
    
    # 2. Make a table out of it
    table = pw.io.python.read(
        subject,
        schema=pw.schema_builder({
            "value": pw.column_definition(dtype=int),
            "gen_ts": pw.column_definition(dtype=float)
        }),
        autocommit_duration_ms=50
    )
    
    # Use the AsyncTransformer
    transformer = ProcessingTransformer(table, instance = 0).successful
    
    # Subscribe to the output of the transformer
    pw.io.subscribe(transformer, on_change=on_change)

    # 4. Checker thread
    def checker():
        last_value = -1
        processed_count = 0
        order_count = 0

        print("Checker thread started, waiting for values...")
        
        while processed_count < count:
            try:
                # Wait for item with timeout
                row = q.get(timeout=5.0)
                val = row['value']
                gen_ts = row['gen_ts']
                
                # Check order
                if val != last_value + 1:
                    print(f"ERROR: Order broken! Expected {last_value + 1}, got {val}")
                    order_count += 1

                last_value = val
                processed_count += 1
                
                # Calculate latency
                latency = time.time() - gen_ts
                if processed_count % 10 == 0:
                    print(f"Received {val}, Latency: {latency*1000:.2f}ms, Order errors%: {order_count/processed_count*100:.3f}%")
                    
                
            except queue.Empty:
                print("Timeout waiting for value in queue")
                os._exit(1)
            except Exception as e:
                print(f"Checker thread exception: {e}")
                os._exit(1)
        
        print("SUCCESS: All values received in order.")
        os._exit(0)

    t = threading.Thread(target=checker, daemon=True)
    t.start()

    # Run pathway
    print("Starting Pathway engine...")
    pw.run(monitoring_level=pw.MonitoringLevel.NONE)

if __name__ == "__main__":
    test_latency()
