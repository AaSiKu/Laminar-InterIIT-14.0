from lib.trigger_rca import TriggerRCANode
import pathway as pw
from typing import List

def trigger_rca(inputs: List[pw.Table], _) -> pw.Table:
    # Retreive columns which contain trace ids relevent to the calculation of the metric connected to the TriggerRCA node
    # If there are multiple columns make a tuple with them
    #   If the multiple such columns are all pw.ndarrays then zip them together
    metric_table = inputs[0]
    pass