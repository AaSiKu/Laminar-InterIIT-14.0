import sys
import os
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
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from backend.pipeline.mappings.streaming_ml import _apply_streaming_ml
from backend.lib.tables.stream_ml import ARFNode

def run_test():
    # Configuration
    csv_path = os.path.join(os.path.dirname(__file__), '../nifty50.csv')
    output_dir = os.path.join(os.path.dirname(__file__), 'test_plots')
    os.makedirs(output_dir, exist_ok=True)
    
    N_SAMPLES = 5000
    
    print(f"Loading data from {csv_path}...")
    # Load data
    df = pd.read_csv(csv_path).iloc[:N_SAMPLES]
    
    # Normalize 'close' column
    data_min = df['close'].min()
    data_max = df['close'].max()
    df['close'] = (df['close'] - data_min) / (data_max - data_min)
    
    # Use 'close' as the single channel and add index for sorting
    df = df[['close']].copy()
    df['row_index'] = range(len(df))
    
    print(f"Creating Pathway table with {len(df)} rows...")
    table = pw.debug.table_from_pandas(df)
    
    # Define ARF Node
    node = ARFNode(
        channel_list=['close'],
        lookback=1,
        horizon=1,
        batch_size=1,
        epochs=1,
        n_models=10,
        max_depth=15,
        seed=42
    )
    
    print("Applying streaming ML mapping...")
    # Apply streaming ML
    result_table = _apply_streaming_ml(table, node, "arf")
    
    # Run pipeline and get results
    print("Running pipeline (this may take a moment)...")
    output_df = pw.debug.table_to_pandas(result_table)
    
    # Sort by row_index to ensure temporal order
    output_df = output_df.sort_values('row_index')
    
    print("Processing results...")
    
    # Extract data
    gt = output_df['close'].values
    preds_raw = output_df['model_prediction'].values
    errs_raw = output_df['model_error'].values
    
    # Process predictions (handle lists/None)
    preds = []
    for p in preds_raw:
        if p is None:
            preds.append(np.nan)
        elif isinstance(p, list):
            if not p:
                preds.append(np.nan)
            else:
                preds.append(p[0]) # Single channel
        elif isinstance(p, np.ndarray):
             preds.append(p.item() if p.size == 1 else p[0])
        else:
            preds.append(p)
            
    preds = np.array(preds, dtype=float).flatten()
    
    # Process errors (handle None/Lists)
    errs = []
    for e in errs_raw:
        if e is None:
            errs.append(np.nan)
        elif isinstance(e, list):
            errs.append(e[0] if e else np.nan)
        else:
            try:
                errs.append(float(e))
            except (TypeError, ValueError):
                errs.append(np.nan)
    errs = np.array(errs, dtype=float)
    
    # Align for plotting
    # The model predicts the NEXT step.
    # So prediction at index i is for ground truth at index i+1.
    # We want to plot GT[1:] vs Preds[:-1].
    
    # Ensure we have enough data
    if len(gt) < 2:
        print("Not enough data to plot.")
        return

    plot_gt = gt[1:]
    plot_preds = preds[:-1]
    
    # Errors are calculated by the model for the current step (using previous prediction).
    # So errs[i] corresponds to the error at step i.
    # We align it with plot_gt (which starts at index 1).
    plot_errs = errs[1:]
    
    # Plotting
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # Plot 1: Prediction vs Ground Truth
    # Clip predictions to avoid massive outliers destroying the plot scale
    # We expect values in [0, 1] mostly.
    plot_preds_clipped = np.clip(plot_preds, -0.5, 1.5)
    
    ax1.plot(plot_gt, label='Ground Truth', alpha=0.7, color='blue')
    ax1.plot(plot_preds_clipped, label='Prediction (Clipped)', alpha=0.7, color='orange')
    ax1.set_title('Prediction vs Ground Truth (ARF) - Normalized & Clipped')
    ax1.set_ylabel('Normalized Value')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Error over samples
    # Filter out None/NaN errors for plotting
    valid_indices = ~np.isnan(plot_errs.astype(float))
    sample_indices = np.arange(len(plot_errs))
    
    ax2.plot(sample_indices[valid_indices], plot_errs[valid_indices].astype(float), label='Absolute Error', color='red', alpha=0.5)
    ax2.set_title('Error over Samples')
    ax2.set_xlabel('Sample')
    ax2.set_ylabel('Error')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plot_path = os.path.join(output_dir, 'arf_pathway_test.png')
    plt.savefig(plot_path)
    print(f"Plot saved to {plot_path}")
    
    # Print stats
    valid_preds_count = np.sum(~np.isnan(preds))
    print(f"Total samples processed: {len(output_df)}")
    print(f"Valid predictions: {valid_preds_count}")
    
    if valid_preds_count > 0:
        # Calculate metrics on aligned data
        valid_mask = ~np.isnan(plot_preds)
        
        mae = np.mean(np.abs(plot_gt[valid_mask] - plot_preds[valid_mask]))
        print(f"Calculated MAE (on aligned data): {mae:.4f}")
        
        # Compare with model reported error
        valid_errs = plot_errs[valid_indices].astype(float)
        print(f"Model Reported Mean Error: {np.mean(valid_errs):.4f}")

if __name__ == "__main__":
    run_test()
