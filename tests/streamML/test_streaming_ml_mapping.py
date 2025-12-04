print("Starting test...")
import sys
import os

# Add workspace root to sys.path FIRST before importing backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
# Add backend to sys.path so 'lib' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

import pandas as pd
import matplotlib.pyplot as plt
import pytest
import multiprocessing
import time
import threading
import json
import numpy as np
import pathway as pw
import random
from backend.pipeline.mappings.streaming_ml import arf_node_fn, tide_node_fn, mamba_node_fn
from backend.lib.tables.stream_ml import ARFNode, TiDENode, MambaNode

class StreamingValueSubject(pw.io.python.ConnectorSubject):
    def __init__(self, values: list[tuple], min_delay: float = 0.01, max_delay: float = 0.011):
        super().__init__()
        self.values = values
        self.min_delay = min_delay
        self.max_delay = max_delay
    
    def run(self):
        for idx, value in self.values:
            delay = random.uniform(self.min_delay, self.max_delay)
            time.sleep(delay)
            self.next(idx=idx, value=value)
        print("[Stream] All values emitted, closing stream...")
        self.close()

class InputSchema(pw.Schema):
    idx: int
    value: float

def test_arf_streaming_mapping():
    # Configuration
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "../nifty50.csv")
    output_csv = os.path.join(base_dir, "temp_mapping_output.csv")
    plot_dir = os.path.join(base_dir, "plots/") # Saving where original test saved
    os.makedirs(plot_dir, exist_ok=True)
    limit_rows = 10000 # Reduced for faster testing
    
    ################################################

    print(f"Loading data from {csv_path}...")
    df_full = pd.read_csv(csv_path).reset_index(drop=True)
    df = df_full.head(limit_rows).copy()['close'].reset_index(drop=True)
    # Create list of (index, value) tuples
    df = [(i, val) for i, val in enumerate(df)]
    input_table = pw.io.python.read(
        StreamingValueSubject(df, min_delay=0.001, max_delay=0.0011),
        schema=InputSchema
    )
    # arf_node = ARFNode(
    #     channel_list = ["value"],
    #     lookback = 5,
    #     horizon = 1,
    #     batch_size = 32,
    #     epochs = 1,
    #     n_models = 15,
    #     max_depth = 20,
    #     seed = None,
    #     max_concurrent_training = 8
    # )
    # result_table = arf_node_fn([input_table], arf_node)

    mamba_node = MambaNode(
        channel_list = ["value"],
        lookback = 5,
        horizon = 1,
        batch_size = 32,
        epochs = 1,
        d_model = 16,
        num_layers = 2,
        d_state = 16,
        d_conv = 4,
        expand = 4,
        learning_rate = 0.01,
        max_concurrent_training = 8
    )
    result_table = mamba_node_fn([input_table], mamba_node)

    # tide_node = TiDENode(
    #     channel_list = ["value"],
    #     lookback = 5,
    #     horizon = 1,
    #     batch_size = 32,
    #     epochs = 1,
    #     hidden_dim = 16,
    #     optimizer = "adam",
    #     learning_rate = 0.01,
    #     clipnorm = 1.0,
    #     max_concurrent_training = 8
    # )
    # result_table = tide_node_fn([input_table], tide_node)

    if os.path.exists(output_csv): os.remove(output_csv)
    pw.io.csv.write(
        result_table,
        output_csv,
    )
    pw.run()

    #################################################

    # Plot results
    print(f"Plotting results from {output_csv}...")
    df_results = pd.read_csv(output_csv)
    
    # Sort by idx to ensure correct plotting order
    #if 'idx' in df_results.columns:
    #    df_results = df_results.sort_values('idx')
    
    df_results = df_results[-limit_rows//5:]
    
    # Parse model_prediction from string to list and extract first value
    df_results['prediction'] = df_results['model_prediction'].apply(
        lambda x: json.loads(x)[0] if pd.notna(x) and x else np.nan
    )
    
    # Create figure with 2 subplots
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
    
    # Subplot 1: Error vs Samples
    ax1.plot(df_results.index, df_results['model_error'], 'r-', linewidth=1, label='Model Error')
    ax1.set_ylabel('Error (MAE)')
    ax1.set_title('Model Error vs Samples')
    ax1.legend(loc='upper right')
    ax1.grid(True, alpha=0.3)
    
    # Subplot 2: Prediction vs Ground Truth
    ax2.plot(df_results.index, df_results['value'], 'b-', linewidth=1, label='Ground Truth')
    ax2.plot(df_results.index, df_results['prediction'], 'r-', linewidth=1, label='Prediction', alpha=0.8)
    ax2.set_xlabel('Sample Index')
    ax2.set_ylabel('Value')
    ax2.set_title('Prediction vs Ground Truth')
    ax2.legend(loc='upper right')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plot_path = os.path.join(plot_dir, "streaming_results.png")
    plt.savefig(plot_path, dpi=150)
    print(f"Plot saved to {plot_path}")
    plt.show()


if __name__ == "__main__":
    test_arf_streaming_mapping()