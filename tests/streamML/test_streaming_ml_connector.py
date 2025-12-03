import sys
import os
import time
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import multiprocessing
import json
from unittest.mock import MagicMock

# Add workspace root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
# Add backend to sys.path so 'lib' can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

# Mock modules that require heavy dependencies
# We need to mock them BEFORE importing backend.pipeline.mappings.streaming_ml or stream_ml.wrapper
sys.modules["stream_ml.tide"] = MagicMock()
sys.modules["stream_ml.mamba"] = MagicMock()

import pathway as pw
from backend.pipeline.mappings.streaming_ml import _apply_streaming_ml
from backend.lib.tables.stream_ml import ARFNode

# Define Schema
class InputSchema(pw.Schema):
    close: float
    row_index: int

def run_pipeline(input_path, output_path):
    # Re-apply mocks if needed (though fork should handle it, better safe)
    sys.modules["stream_ml.tide"] = MagicMock()
    sys.modules["stream_ml.mamba"] = MagicMock()
    
    # Read stream
    t = pw.io.csv.read(input_path, schema=InputSchema, mode="streaming")
    
    # Define Node
    node = ARFNode(
        channel_list=['close'],
        lookback=20,
        horizon=100,
        batch_size=1,
        epochs=1,
        n_models=10,
        max_depth=15,
        seed=42
    )
    
    # Apply Model
    result = _apply_streaming_ml(t, node, "arf")
    
    # Write output
    pw.io.csv.write(result, output_path)
    
    # Run
    pw.run()

def run_test():
    # Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_csv = os.path.join(base_dir, 'temp_stream_input.csv')
    output_csv = os.path.join(base_dir, 'temp_stream_output.csv')
    plot_dir = os.path.join(base_dir, 'test_plots')
    os.makedirs(plot_dir, exist_ok=True)
    
    # Clean up previous
    if os.path.exists(input_csv): os.remove(input_csv)
    if os.path.exists(output_csv): os.remove(output_csv)
    
    N_SAMPLES = 1000
    
    print(f"Preparing data ({N_SAMPLES} samples)...")
    # Prepare Data
    orig_csv = os.path.join(base_dir, '../nifty50.csv')
    df = pd.read_csv(orig_csv).iloc[:N_SAMPLES]
    
    # Normalize
    d_min, d_max = df['close'].min(), df['close'].max()
    df['close'] = (df['close'] - d_min) / (d_max - d_min)
    df['row_index'] = range(len(df))
    
    # Save input
    # df[['close', 'row_index']].to_csv(input_csv, index=False)
    # print(f"Input saved to {input_csv}")
    
    # Initialize CSV with header only
    with open(input_csv, 'w') as f:
        f.write("close,row_index\n")
    print(f"Initialized input CSV at {input_csv}")
    
    # Start Pipeline Process
    print("Starting Pathway pipeline process...")
    p = multiprocessing.Process(target=run_pipeline, args=(input_csv, output_csv))
    p.start()
    
    # Start streaming data
    STREAM_DELAY = 0.01  # Delay in seconds between rows
    print(f"Streaming data with {STREAM_DELAY}s delay...")
    
    def stream_data():
        for _, row in df.iterrows():
            with open(input_csv, 'a') as f:
                f.write(f"{row['close']},{int(row['row_index'])}\n")
            time.sleep(STREAM_DELAY)
            
    # Run streaming in a separate thread/process or just here if we want to block
    # Since we need to monitor output concurrently, let's use a thread for streaming
    import threading
    stream_thread = threading.Thread(target=stream_data)
    stream_thread.start()
    
    print("Waiting for output generation...")
    
    # Monitor output
    start_time = time.time()
    lines_found = 0
    while True:
        if os.path.exists(output_csv):
            try:
                with open(output_csv, 'r') as f:
                    # Count lines (simple approach)
                    lines_found = sum(1 for _ in f)
                
                # Header + N_SAMPLES
                if lines_found >= N_SAMPLES + 1:
                    print(f"Collected {lines_found} lines. Stopping pipeline.")
                    break
                
                if lines_found % 1000 == 0 and lines_found > 0:
                    print(f"Progress: {lines_found} lines...")
                    
            except Exception:
                pass
        
        if time.time() - start_time > 300: # 5 minute timeout for streaming
            print(f"Timeout waiting for output. Found {lines_found} lines.")
            break
        time.sleep(1)
        
    # Ensure streaming is done
    stream_thread.join(timeout=1)
    
    p.terminate()
    p.join()
    
    if lines_found < 2:
        print("No output data generated.")
        return

    print("Processing results...")
    # Read output CSV
    # Pathway CSV write might quote lists like "[0.123]"
    output_df = pd.read_csv(output_csv)
    
    # Sort
    output_df = output_df.sort_values('row_index')
    
    # Extract data
    gt = output_df['close'].values
    
    # Parse predictions
    # They might be strings "[val]" or floats if flattened?
    # Based on previous test, UDF returns list. CSV writer writes string representation of list.
    preds = []
    for val in output_df['model_prediction']:
        if isinstance(val, str):
            try:
                # Parse stringified list
                parsed = json.loads(val)
                if isinstance(parsed, list) and parsed:
                    preds.append(parsed[0])
                else:
                    preds.append(np.nan)
            except:
                preds.append(np.nan)
        elif isinstance(val, (int, float)):
            preds.append(val)
        else:
            preds.append(np.nan)
            
    preds = np.array(preds, dtype=float)
    
    # Parse errors
    errs = []
    for val in output_df['model_error']:
        try:
            errs.append(float(val))
        except:
            errs.append(np.nan)
    errs = np.array(errs, dtype=float)

    # Align for plotting (same logic as before)
    # Prediction at i is for GT at i+1
    if len(gt) < 2:
        print("Not enough data to plot.")
        return

    plot_gt = gt[1:]
    plot_preds = preds[:-1]
    plot_errs = errs[1:]
    
    # Plotting
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # Plot 1: Prediction vs Ground Truth
    # Clip predictions
    plot_preds_clipped = np.clip(plot_preds, -0.5, 1.5)
    
    ax1.plot(plot_gt, label='Ground Truth', alpha=0.7, color='blue')
    ax1.plot(plot_preds_clipped, label='Prediction (Clipped)', alpha=0.7, color='orange')
    ax1.set_title('Prediction vs Ground Truth (ARF) - Streaming Connector Test')
    ax1.set_ylabel('Normalized Value')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Error over samples
    valid_indices = ~np.isnan(plot_errs)
    sample_indices = np.arange(len(plot_errs))
    
    ax2.plot(sample_indices[valid_indices], plot_errs[valid_indices], label='Absolute Error', color='red', alpha=0.5)
    ax2.set_title('Error over Samples')
    ax2.set_xlabel('Sample')
    ax2.set_ylabel('Error')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plot_path = os.path.join(plot_dir, 'arf_connector_test.png')
    plt.savefig(plot_path)
    print(f"Plot saved to {plot_path}")
    
    # Cleanup
    if os.path.exists(input_csv): os.remove(input_csv)
    if os.path.exists(output_csv): os.remove(output_csv)

if __name__ == "__main__":
    run_test()
