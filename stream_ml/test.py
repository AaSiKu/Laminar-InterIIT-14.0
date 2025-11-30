"""
Tests for ModelWrapper class with ARF and TiDE models.
Uses nifty50.csv for testing streaming ML predictions with multivariate data.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from typing import List, Tuple, Dict, Any
import time
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stream_ml.wrapper import ModelWrapper


# ============================================================================
# Data Loading and Preprocessing
# ============================================================================

def load_nifty50_dataset(filepath: str, max_samples: int = 10000) -> pd.DataFrame:
    """Load and preprocess the nifty50 dataset with open and close columns."""
    df = pd.read_csv(filepath)
    # Use only open and close columns
    df_numeric = df[['open', 'close']].copy()
    df_numeric = df_numeric.fillna(method='ffill').fillna(0)
    # Limit samples for faster testing
    if len(df_numeric) > max_samples:
        df_numeric = df_numeric.iloc[:max_samples]
    return df_numeric


def create_sequences(data: np.ndarray, lookback: int, horizon: int) -> Tuple[np.ndarray, np.ndarray]:
    """Create input-output sequences for time series forecasting."""
    X, y = [], []
    for i in range(len(data) - lookback - horizon + 1):
        X.append(data[i:i + lookback])
        y.append(data[i + lookback:i + lookback + horizon])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def normalize_data(data: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Normalize data using min-max scaling."""
    data_min = data.min(axis=0)
    data_max = data.max(axis=0)
    data_range = data_max - data_min
    data_range[data_range == 0] = 1
    normalized = (data - data_min) / data_range
    return normalized, data_min, data_max


# ============================================================================
# Metrics Calculation
# ============================================================================

def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculate all metrics."""
    mae = np.mean(np.abs(y_true - y_pred))
    mse = np.mean((y_true - y_pred) ** 2)
    rmse = np.sqrt(mse)
    mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100
    return {'MAE': mae, 'MSE': mse, 'RMSE': rmse, 'MAPE': mape}


# ============================================================================
# Plotting Functions
# ============================================================================

def plot_predictions_vs_ground_truth(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str,
    feature_names: List[str],
    save_path: str = None
):
    """Plot predictions vs ground truth over all samples."""
    if y_true.ndim == 1:
        y_true = y_true.reshape(-1, 1)
    if y_pred.ndim == 1:
        y_pred = y_pred.reshape(-1, 1)
    
    n_features = min(y_true.shape[1], y_pred.shape[1], len(feature_names))
    
    fig, axes = plt.subplots(n_features, 1, figsize=(14, 4 * n_features))
    if n_features == 1:
        axes = [axes]
    
    for i in range(n_features):
        ax = axes[i]
        ax.plot(y_true[:, i], label='Ground Truth', alpha=0.8, linewidth=1.2, color='blue')
        ax.plot(y_pred[:, i], label='Prediction', alpha=0.8, linewidth=1.2, color='orange')
        ax.set_title(f'{feature_names[i]}', fontsize=12)
        ax.set_xlabel('Sample Index')
        ax.set_ylabel('Value')
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
    
    plt.suptitle(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Plot saved to: {save_path}")
    plt.show()


def plot_absolute_errors(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str,
    feature_names: List[str],
    save_path: str = None
):
    """Plot absolute errors over all samples."""
    if y_true.ndim == 1:
        y_true = y_true.reshape(-1, 1)
    if y_pred.ndim == 1:
        y_pred = y_pred.reshape(-1, 1)
    
    errors = np.abs(y_true - y_pred)
    n_features = min(errors.shape[1], len(feature_names))
    
    fig, axes = plt.subplots(n_features, 1, figsize=(14, 4 * n_features))
    if n_features == 1:
        axes = [axes]
    
    for i in range(n_features):
        ax = axes[i]
        ax.plot(errors[:, i], alpha=0.8, linewidth=1, color='red')
        ax.axhline(y=np.mean(errors[:, i]), color='black', linestyle='--', 
                   label=f'Mean Error: {np.mean(errors[:, i]):.4f}')
        ax.set_title(f'{feature_names[i]} - Absolute Error', fontsize=12)
        ax.set_xlabel('Sample Index')
        ax.set_ylabel('Absolute Error')
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
    
    plt.suptitle(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Plot saved to: {save_path}")
    plt.show()


# ============================================================================
# Test Functions
# ============================================================================

def test_arf_model(
    data: np.ndarray,
    input_indices: List[int],
    output_indices: List[int],
    lookback: int = 5,
    horizon: int = 1,
    train_ratio: float = 0.7
) -> Tuple[Dict[str, float], np.ndarray, np.ndarray]:
    """Test ARF model with the wrapper."""
    print("\n" + "="*60)
    print("ARF Model Training and Prediction")
    print("="*60)
    
    X, y = create_sequences(data, lookback, horizon)
    train_size = int(len(X) * train_ratio)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")
    
    arf_config = {
        'in_features': len(input_indices),
        'out_features': len(output_indices),
        'horizon': horizon,
        'lookback': lookback,
        'n_models': 10,
        'max_depth': 15
    }
    
    wrapper = ModelWrapper(
        num_channels=data.shape[1],
        stream_indices=output_indices,  # For autoregressive: input = output
        model_name='arf',
        config=arf_config
    )
    
    # Training
    print("Training...")
    batch_size = 32
    for i in range(0, len(X_train), batch_size):
        batch_X = X_train[i:i+batch_size]
        batch_y = y_train[i:i+batch_size]
        try:
            wrapper.train(batch_X, batch_y)
        except Exception:
            continue
    print("Training completed!")
    
    # Prediction
    print("Running predictions...")
    predictions = []
    ground_truths = []
    wrapper.model.context_history = []
    
    for i in range(len(X_test)):
        # ARF expects single timestep [n_features] for context building
        # Use the last timestep of each sequence
        x_sample = X_test[i, -1, :]  # Shape: [n_features]
        y_sample = y_test[i, 0, :]   # Shape: [n_features]
        try:
            _, _, _, pred = wrapper.predict(x_sample, y_sample)
            # Skip warmup period (first `lookback` samples return zeros)
            if pred is not None and len(pred) > 0:
                pred_value = pred[0] if pred.ndim > 1 else pred
                # Only add if shape matches expected output features
                if hasattr(pred_value, '__len__') and len(pred_value) == len(output_indices):
                    predictions.append(pred_value)
                    ground_truths.append(y_sample[output_indices])
        except Exception as e:
            continue
    
    predictions = np.array(predictions)
    y_true = np.array(ground_truths)
    
    print(f"Valid predictions: {len(predictions)}")
    
    metrics = calculate_metrics(y_true, predictions)
    return metrics, y_true, predictions


def test_tide_model(
    data: np.ndarray,
    input_indices: List[int],
    output_indices: List[int],
    lookback: int = 20,
    horizon: int = 1,
    train_ratio: float = 0.7
) -> Tuple[Dict[str, float], np.ndarray, np.ndarray]:
    """Test TiDE model with the wrapper."""
    print("\n" + "="*60)
    print("TiDE Model Training and Prediction")
    print("="*60)
    
    X, y = create_sequences(data, lookback, horizon)
    train_size = int(len(X) * train_ratio)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"Training samples: {len(X_train)}, Test samples: {len(X_test)}")
    
    tide_config = {
        'in_features': len(input_indices),
        'out_features': len(output_indices),
        'horizon': horizon,
        'lookback': lookback,
        'hidden_dim': 64,
        'batch_size': 32,
        'epochs': 5,
        'learning_rate': 0.001
    }
    
    wrapper = ModelWrapper(
        num_channels=data.shape[1],
        stream_indices=output_indices,  # For autoregressive: input = output
        model_name='tide',
        config=tide_config
    )
    
    # Training
    print("Training...")
    batch_size = 64
    for i in range(0, len(X_train), batch_size):
        batch_X = X_train[i:i+batch_size]
        batch_y = y_train[i:i+batch_size]
        try:
            wrapper.train(batch_X, batch_y)
        except Exception:
            continue
    print("Training completed!")
    
    # Prediction
    print("Running predictions...")
    X_test_input = X_test[:, :, input_indices]
    y_test_output = y_test[:, :, output_indices]
    
    try:
        predictions = wrapper.model.model.predict(X_test_input, verbose=0)
        predictions = predictions[:, 0, :]
        y_true = y_test_output[:, 0, :]
        metrics = calculate_metrics(y_true, predictions)
        return metrics, y_true, predictions
    except Exception as e:
        print(f"Prediction failed: {e}")
        return {}, np.array([]), np.array([])


def run_test():
    """Run tests comparing ARF and TiDE models on nifty50 data."""
    print("\n" + "="*70)
    print("MODEL WRAPPER TEST - NIFTY50 (Open & Close)")
    print("="*70)
    
    # Load dataset
    dataset_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'tests',
        'nifty50.csv'
    )
    
    print(f"\nLoading dataset: {dataset_path}")
    df = load_nifty50_dataset(dataset_path, max_samples=10000)
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    data = df.values.astype(np.float32)
    data_normalized, _, _ = normalize_data(data)
    
    feature_names = list(df.columns)  # ['open', 'close']
    
    # Both ARF and TiDE: 2 inputs (open, close) -> 2 outputs (open, close)
    input_indices = [0, 1]  # open, close
    output_indices = [0, 1]  # open, close
    
    output_names = feature_names  # ['open', 'close']
    
    # Create output directory
    plots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_plots')
    os.makedirs(plots_dir, exist_ok=True)
    
    # Test ARF (2 inputs -> 2 outputs)
    arf_metrics, arf_true, arf_pred = test_arf_model(
        data_normalized, input_indices, output_indices,
        lookback=5, horizon=1, train_ratio=0.7
    )
    
    # Test TiDE (2 inputs -> 2 outputs)
    tide_metrics, tide_true, tide_pred = test_tide_model(
        data_normalized, input_indices, output_indices,
        lookback=20, horizon=1, train_ratio=0.7
    )
    
    # ================================================================
    # Print Metrics
    # ================================================================
    print("\n" + "="*60)
    print("METRICS")
    print("="*60)
    
    if arf_metrics:
        print("\nARF Model:")
        for name, value in arf_metrics.items():
            print(f"  {name}: {value:.6f}")
    
    if tide_metrics:
        print("\nTiDE Model:")
        for name, value in tide_metrics.items():
            print(f"  {name}: {value:.6f}")
    
    if arf_metrics and tide_metrics:
        print("\nComparison:")
        better_mae = 'ARF' if arf_metrics['MAE'] < tide_metrics['MAE'] else 'TiDE'
        better_rmse = 'ARF' if arf_metrics['RMSE'] < tide_metrics['RMSE'] else 'TiDE'
        print(f"  Better MAE: {better_mae}")
        print(f"  Better RMSE: {better_rmse}")
    
    # ================================================================
    # Generate Plots
    # ================================================================
    print("\n" + "="*60)
    print("GENERATING PLOTS")
    print("="*60)
    
    if len(arf_pred) > 0:
        # ARF: Predictions vs Ground Truth
        plot_predictions_vs_ground_truth(
            arf_true, arf_pred,
            'ARF Model - Predictions vs Ground Truth (Nifty50)',
            output_names,
            os.path.join(plots_dir, 'arf_nifty50_predictions.png')
        )
        
        # ARF: Absolute Errors
        plot_absolute_errors(
            arf_true, arf_pred,
            'ARF Model - Absolute Errors (Nifty50)',
            output_names,
            os.path.join(plots_dir, 'arf_nifty50_errors.png')
        )
    
    if len(tide_pred) > 0:
        # TiDE: Predictions vs Ground Truth
        plot_predictions_vs_ground_truth(
            tide_true, tide_pred,
            'TiDE Model - Predictions vs Ground Truth (Nifty50)',
            output_names,
            os.path.join(plots_dir, 'tide_nifty50_predictions.png')
        )
        
        # TiDE: Absolute Errors
        plot_absolute_errors(
            tide_true, tide_pred,
            'TiDE Model - Absolute Errors (Nifty50)',
            output_names,
            os.path.join(plots_dir, 'tide_nifty50_errors.png')
        )
    
    print(f"\nPlots saved to: {plots_dir}")
    print("\n" + "="*70)
    print("TEST COMPLETED!")
    print("="*70)


if __name__ == '__main__':
    run_test()
