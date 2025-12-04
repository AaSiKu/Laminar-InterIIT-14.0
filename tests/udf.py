import pathway as pw
import random
import time
import threading
import os
import csv


ls = []

@pw.udf
def inc(x: int) -> int:
    global ls
    ls.append(x)
    time.sleep(0.2) # Simulate predict in streaming ML
    if(len(ls) >= 5):
        print("Processing 5 elements...")
        time.sleep(0.2) # Simulate batch processing delay
        print(ls)
        ls = []
    return x * 2

# Python stream generator
class StreamingValueSubject(pw.io.python.ConnectorSubject):
    def __init__(self, values: list[int], min_delay: float = 0.51, max_delay: float = 0.52):
        super().__init__()
        self.values = values
        self.min_delay = min_delay
        self.max_delay = max_delay
    
    def run(self):
        for i, value in enumerate(self.values):
            delay = random.uniform(self.min_delay, self.max_delay)
            print(f"[Stream] Emitting value {value} after {delay:.2f}s delay")
            time.sleep(delay)
            self.next(value=value)
        print("[Stream] All values emitted, closing stream...")
        self.close()

def run_streaming_demo():
    values = list(range(1, 16))
    
    input_subject = StreamingValueSubject(values, min_delay=0.5, max_delay=0.51)
    
    # Input table
    input_table = pw.io.python.read(
        input_subject,
        schema=pw.schema_builder({"value": pw.column_definition(dtype=int)}),
        autocommit_duration_ms=50,
    )
    
    # Passed to streaming ML udf
    result = inc(input_table.value) 

    pw.io.subscribe(result, on_change=lambda key, row, time, is_addition: 
        print(f"[Output] time={time}, value={row['value']}, doubled={row['value_doubled']}, added={is_addition}")
    )
    
    pw.run(monitoring_level=pw.MonitoringLevel.NONE)

if __name__ == "__main__":
    run_streaming_demo()
