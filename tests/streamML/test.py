"""
Streaming ML Tests for ARF, TiDE, and Mamba models.
Simulates live streaming: predict one sample at a time, train when batch is ready.
Uses only the ModelWrapper API (no model internals access).
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from stream_ml.wrapper import ModelWrapper


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class ModelConfig:
    """Configuration for a streaming model."""
    name: str
    lookback: int
    horizon: int
    params: Dict


def get_model_configs(in_features: int, out_features: int) -> List[ModelConfig]:
    """Get configurations for all three models."""
    return [
        ModelConfig(
            name='arf',
            lookback=10,
            horizon=1,
            params={
                'in_features': in_features,
                'out_features': out_features,
                'horizon': 1,
                'lookback': 10,
                'n_models': 10,
                'max_depth': 15,
                'seed': 42
            }
        ),
        ModelConfig(
            name='tide',
            lookback=20,
            horizon=1,
            params={
                'in_features': in_features,
                'out_features': out_features,
                'horizon': 1,
                'lookback': 20,
                'hidden_dim': 64,
                'batch_size': 32,
                'epochs': 3,
                'learning_rate': 0.001
            }
        ),
        ModelConfig(
            name='mamba',
            lookback=20,
            horizon=1,
            params={
                'in_features': in_features,
                'out_features': out_features,
                'horizon': 1,
                'lookback': 20,
                'd_model': 32,
                'num_layers': 2,
                'd_state': 16,  # Must be 16 to match hardcoded values in MambaBlock
                'd_conv': 4,
                'expand': 2,
                'learning_rate': 0.005,
                'epochs': 3,
                'batch_size': 32
            }
        )
    ]


# ============================================================================
# Data Loading
# ============================================================================

def load_dataset(filepath: str, columns: List[str], max_samples: int = 2000) -> np.ndarray:
    """Load and normalize dataset."""
    df = pd.read_csv(filepath)
    data = df[columns].ffill().fillna(0).values[:max_samples].astype(np.float32)
    
    # Min-max normalization
    data_min, data_max = data.min(axis=0), data.max(axis=0)
    data_range = np.where(data_max - data_min == 0, 1, data_max - data_min)
    return (data - data_min) / data_range


# ============================================================================
# Streaming Simulation
# ============================================================================

@dataclass
class StreamingBuffer:
    """Buffer for accumulating samples for training."""
    lookback: int
    horizon: int
    batch_size: int
    samples: List[np.ndarray] = field(default_factory=list)
    
    def add_sample(self, sample: np.ndarray) -> None:
        """Add a single sample to the buffer."""
        self.samples.append(sample)
    
    def can_train(self) -> bool:
        """Check if enough samples accumulated for a training batch."""
        min_samples = (self.lookback + self.horizon) * self.batch_size
        return len(self.samples) >= min_samples
    
    def get_training_batch(self) -> Tuple[np.ndarray, np.ndarray]:
        """Extract training batch from accumulated samples."""
        X_batch, y_batch = [], []
        
        for i in range(self.batch_size):
            start_idx = i * (self.lookback + self.horizon)
            X_batch.append(self.samples[start_idx:start_idx + self.lookback])
            y_batch.append(self.samples[start_idx + self.lookback:start_idx + self.lookback + self.horizon])
        
        # Clear used samples, keep remaining
        used = self.batch_size * (self.lookback + self.horizon)
        self.samples = self.samples[used:]
        
        return np.array(X_batch, dtype=np.float32), np.array(y_batch, dtype=np.float32)
    
    def clear(self) -> None:
        """Clear the buffer."""
        self.samples = []


@dataclass
class StreamingMetrics:
    """Metrics collected during streaming simulation."""
    predictions: List[np.ndarray] = field(default_factory=list)
    ground_truths: List[np.ndarray] = field(default_factory=list)
    errors: List[float] = field(default_factory=list)
    latencies: List[float] = field(default_factory=list)
    ram_usages: List[float] = field(default_factory=list)
    train_maes: List[float] = field(default_factory=list)
    train_latencies: List[float] = field(default_factory=list)
    train_ram: List[float] = field(default_factory=list)
    
    def add_prediction(self, pred: np.ndarray, truth: np.ndarray, error: float, 
                       latency: float, ram: float) -> None:
        self.predictions.append(pred)
        self.ground_truths.append(truth)
        self.errors.append(error)
        self.latencies.append(latency)
        self.ram_usages.append(ram)
    
    def add_train_result(self, mae: float, latency: float, ram: float) -> None:
        self.train_maes.append(mae)
        self.train_latencies.append(latency)
        self.train_ram.append(ram)


def simulate_streaming(
    wrapper: ModelWrapper,
    data: np.ndarray,
    config: ModelConfig,
    batch_size: int = 32
) -> StreamingMetrics:
    """
    Simulate live streaming: predict one sample at a time, train when batch is ready.
    
    Flow:
    1. Feed samples one-by-one to predict()
    2. Accumulate samples in buffer
    3. When buffer has batch_size * (lookback + horizon) samples, call train()
    4. Continue predicting until next training batch is ready
    """
    metrics = StreamingMetrics()
    buffer = StreamingBuffer(config.lookback, config.horizon, batch_size)
    
    train_count = 0
    
    for i, sample in enumerate(data):
        # Predict on current sample
        ram, latency, error, pred = wrapper.predict(sample)
        
        # Only record metrics after warmup (model has enough context)
        # Check if error is not inf (meaning valid prediction was made)
        if error != float('inf') and i + 1 < len(data):
            truth = data[i + 1]
            actual_error = np.mean(np.abs(pred[0] - truth)) if pred.shape[0] > 0 else float('inf')
            metrics.add_prediction(pred[0], truth, actual_error, latency, ram)
        
        # Add sample to training buffer
        buffer.add_sample(sample)
        
        # Train when buffer is ready
        if buffer.can_train():
            X_batch, y_batch = buffer.get_training_batch()
            train_ram, train_latency, train_mae = wrapper.train(X_batch, y_batch)
            metrics.add_train_result(train_mae, train_latency, train_ram)
            train_count += 1
            
            # Progress indicator
            if train_count % 5 == 0:
                print(f"  Trained batch {train_count}, samples processed: {i+1}/{len(data)}")
    
    return metrics


# ============================================================================
# Metrics Calculation
# ============================================================================

def compute_final_metrics(metrics: StreamingMetrics) -> Dict:
    """Compute final aggregated metrics."""
    if not metrics.predictions:
        return {}
    
    preds = np.array(metrics.predictions)
    truths = np.array(metrics.ground_truths)
    
    mae = float(np.mean(np.abs(truths - preds)))
    mse = float(np.mean((truths - preds) ** 2))
    rmse = float(np.sqrt(mse))
    # Avoid division by zero in MAPE by adding small epsilon
    mape = float(np.mean(np.abs((truths - preds) / (np.abs(truths) + 1e-8))) * 100)
    
    return {
        'MAE': mae,
        'MSE': mse,
        'RMSE': rmse,
        'MAPE': mape,
        'Avg Predict Latency (ms)': float(np.mean(metrics.latencies) * 1000) if metrics.latencies else 0.0,
        'Avg Predict RAM (MB)': float(np.mean(metrics.ram_usages)) if metrics.ram_usages else 0.0,
        'Avg Train MAE': float(np.mean(metrics.train_maes)) if metrics.train_maes else 0.0,
        'Avg Train Latency (ms)': float(np.mean(metrics.train_latencies) * 1000) if metrics.train_latencies else 0.0,
        'Num Train Batches': len(metrics.train_maes)
    }


# ============================================================================
# Plotting
# ============================================================================

def plot_predictions(
    metrics: StreamingMetrics,
    model_name: str,
    feature_names: List[str],
    save_dir: str
) -> None:
    """Plot predictions vs ground truth and errors."""
    if not metrics.predictions:
        print(f"  No predictions to plot for {model_name}")
        return
    
    preds = np.array(metrics.predictions)
    truths = np.array(metrics.ground_truths)
    n_features = min(preds.shape[1], len(feature_names))
    
    # Predictions vs Ground Truth
    fig, axes = plt.subplots(n_features, 1, figsize=(14, 4 * n_features))
    axes = [axes] if n_features == 1 else axes
    
    for i, ax in enumerate(axes):
        ax.plot(truths[:, i], label='Ground Truth', alpha=0.8, linewidth=1.2, color='blue')
        ax.plot(preds[:, i], label='Prediction', alpha=0.8, linewidth=1.2, color='orange')
        ax.set_title(f'{feature_names[i]}', fontsize=12)
        ax.set_xlabel('Sample Index')
        ax.set_ylabel('Value')
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
    
    plt.suptitle(f'{model_name.upper()} - Predictions vs Ground Truth', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(save_dir, f'{model_name}_predictions.png'), dpi=150, bbox_inches='tight')
    plt.close()
    
    # Absolute Errors
    errors = np.abs(truths - preds)
    fig, axes = plt.subplots(n_features, 1, figsize=(14, 4 * n_features))
    axes = [axes] if n_features == 1 else axes
    
    for i, ax in enumerate(axes):
        ax.plot(errors[:, i], alpha=0.8, linewidth=1, color='red')
        ax.axhline(y=np.mean(errors[:, i]), color='black', linestyle='--',
                   label=f'Mean: {np.mean(errors[:, i]):.4f}')
        ax.set_title(f'{feature_names[i]} - Absolute Error', fontsize=12)
        ax.set_xlabel('Sample Index')
        ax.set_ylabel('Error')
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
    
    plt.suptitle(f'{model_name.upper()} - Absolute Errors', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(save_dir, f'{model_name}_errors.png'), dpi=150, bbox_inches='tight')
    plt.close()


def plot_comparison(all_metrics: Dict[str, Dict], save_dir: str) -> None:
    """Plot comparison bar chart for all models."""
    models = list(all_metrics.keys())
    if len(models) < 2:
        return
    
    metrics_to_compare = ['MAE', 'RMSE', 'Avg Predict Latency (ms)']
    fig, axes = plt.subplots(1, len(metrics_to_compare), figsize=(5 * len(metrics_to_compare), 5))
    
    colors = ['#3498db', '#e74c3c', '#2ecc71']
    
    for idx, metric in enumerate(metrics_to_compare):
        values = [all_metrics[m].get(metric, 0) for m in models]
        axes[idx].bar(models, values, color=colors[:len(models)])
        axes[idx].set_title(metric, fontsize=12)
        axes[idx].set_ylabel('Value')
        max_val = max(values) if values else 1
        for i, v in enumerate(values):
            axes[idx].text(i, v + 0.01 * max_val, f'{v:.4f}', ha='center', fontsize=9)
    
    plt.suptitle('Model Comparison', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(save_dir, 'model_comparison.png'), dpi=150, bbox_inches='tight')
    plt.close()


# ============================================================================
# Main Test Runner
# ============================================================================

def run_streaming_tests():
    """Run streaming tests for all models."""
    print("\n" + "=" * 70)
    print("STREAMING ML TEST - ARF, TiDE, Mamba")
    print("=" * 70)
    
    # Configuration
    dataset_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'tests', 'nifty50.csv'
    )
    feature_columns = ['open', 'close']
    stream_indices = [0, 1]  # Both features for input and output
    batch_size = 1
    max_samples = 2000  # Reduced for faster testing
    
    # Load data
    print(f"\nLoading dataset: {dataset_path}")
    data = load_dataset(dataset_path, feature_columns, max_samples)
    print(f"Data shape: {data.shape}")
    
    # Output directory
    plots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_plots')
    os.makedirs(plots_dir, exist_ok=True)
    
    # Get model configurations
    configs = get_model_configs(
        in_features=len(stream_indices),
        out_features=len(stream_indices)
    )
    
    all_metrics: Dict[str, Dict[str, float]] = {}
    
    # Test each model
    for config in configs:
        print(f"\n{'=' * 60}")
        print(f"Testing: {config.name.upper()}")
        print(f"  Lookback: {config.lookback}, Horizon: {config.horizon}")
        print(f"{'=' * 60}")
        
        # Create wrapper
        wrapper = ModelWrapper(
            num_channels=len(feature_columns),
            stream_indices=stream_indices,
            model_name=config.name,
            config=config.params
        )
        
        # Run streaming simulation
        print("\nRunning streaming simulation...")
        metrics = simulate_streaming(wrapper, data, config, batch_size)
        
        # Compute final metrics
        final_metrics = compute_final_metrics(metrics)
        all_metrics[config.name] = final_metrics
        
        # Print metrics
        print(f"\n{config.name.upper()} Results:")
        for name, value in final_metrics.items():
            print(f"  {name}: {value:.6f}" if isinstance(value, float) else f"  {name}: {value}")
        
        # Generate plots
        plot_predictions(metrics, config.name, feature_columns, plots_dir)
        print(f"  Plots saved to: {plots_dir}")
    
    # Comparison
    print("\n" + "=" * 60)
    print("COMPARISON")
    print("=" * 60)
    
    if len(all_metrics) >= 2:
        plot_comparison(all_metrics, plots_dir)
        
        # Find best models
        valid_metrics = {k: v for k, v in all_metrics.items() if v.get('MAE', float('inf')) < float('inf')}
        if valid_metrics:
            best_mae = min(valid_metrics.items(), key=lambda x: x[1]['MAE'])
            best_rmse = min(valid_metrics.items(), key=lambda x: x[1]['RMSE'])
            print(f"\nBest MAE:  {best_mae[0].upper()} ({best_mae[1]['MAE']:.6f})")
            print(f"Best RMSE: {best_rmse[0].upper()} ({best_rmse[1]['RMSE']:.6f})")
    
    print(f"\nAll plots saved to: {plots_dir}")
    print("\n" + "=" * 70)
    print("TEST COMPLETED!")
    print("=" * 70)


if __name__ == '__main__':
    run_streaming_tests()
