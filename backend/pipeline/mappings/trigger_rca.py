from lib.trigger_rca import TriggerRCANode
import pathway as pw
from typing import List
from .open_tel.prefix import open_tel_trace_id
def trigger_rca(inputs: List[pw.Table], _) -> pw.Table:
    # Retreive columns which contain trace ids relevent to the calculation of the metric connected to the TriggerRCA node
    # If there are multiple columns make a tuple with them
    #   If the multiple such columns are all pw.ndarrays then zip them together
    metric_table = inputs[0]
    trace_id_columns = [col_name for col_name in metric_table.column_names() if col_name.find(open_tel_trace_id) != -1]
    pass