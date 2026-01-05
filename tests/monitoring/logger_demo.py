import time
import os

import pathway as pw
from logger import custom_logger


class DemoStream(pw.io.python.ConnectorSubject):
    def __init__(self):
        super().__init__()
        self.count = 0

    def run(self):
        while True:
            self.count += 1
            custom_logger.info(f"Producing value #{self.count}")  # Goes to PostgreSQL only

            # Simulate an error after 5 iterations
            if self.count == 5:
                custom_logger.error("Simulated error: Connection timeout occurred!")  # Goes to both

            # Simulate a warning at count 3
            if self.count == 3:
                custom_logger.warning("High memory usage detected")  # Goes to both

            # Simulate a critical error at count 8
            if self.count == 8:
                custom_logger.critical("Critical failure: Database unreachable!")  # Goes to both
                raise Exception("Simulated critical failure after 8 iterations")

            self.next(value=1)
            time.sleep(1)


class InputSchema(pw.Schema):
    value: int


# Example: Important startup log goes to both PostgreSQL and MongoDB
custom_logger.critical("Pipeline starting")

try:
    table1 = pw.io.python.read(DemoStream(), schema=InputSchema)
    table2 = table1.reduce(sum=pw.reducers.sum(pw.this.value))
    pw.io.null.write(table2)
    pw.run()
except Exception as e:
    # This error will be sent to both PostgreSQL and MongoDB
    custom_logger.error(f"Error running pipeline: {e}")
