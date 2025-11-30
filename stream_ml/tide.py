import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import matplotlib.pyplot as plt
import time
import psutil
import os
from sklearn.metrics import mean_squared_error
from typing import List, Optional, Tuple
from numpy.typing import NDArray
from stream_ml.model import BaseModel as StreamBaseModel
from pydantic import BaseModel as PydanticBaseModel, Field


class TiDEConfig(PydanticBaseModel):
    in_features: int = Field(..., gt=0)
    out_features: int = Field(..., gt=0)
    horizon: int = Field(..., gt=0)
    lookback: int = Field(..., gt=0)
    hidden_dim: int = Field(32, gt=0)
    batch_size: int = Field(32, gt=0)
    epochs: int = Field(1)
    optimizer: str = Field('adam')
    learning_rate: float = Field(0.001)
    clipnorm: Optional[float] = Field(None)


class TiDEModel(StreamBaseModel):
    """
    TiDE (Time-series Dense Encoder) Model for multivariate time series forecasting.
    Inherits from BaseModel and implements run() and predict() methods.
    
    Model Architecture:
    - Flattens multivariate input
    - Dense encoder layers
    - Dense decoder layers
    - Residual connection from input to output
    - Outputs multiple quantiles for probabilistic forecasting
    """
    
    def __init__(
        self,
        in_features: int,
        out_features: int,
        horizon: int = 1,
        lookback: int = 200,
        hidden_dim: int = 64,
        batch_size: int = 32,
        epochs: int = 1,
        optimizer: str = 'adam',
        learning_rate: float = 0.001,
        clipnorm: Optional[float] = None
    ):
        self.lookback = lookback
        self.horizon = horizon
        self.hidden_dim = hidden_dim
        self.in_features = in_features
        self.out_features = out_features
        self.batch_size = batch_size
        self.epochs = epochs
        self.optimizer = optimizer
        self.learning_rate = learning_rate
        self.clipnorm = clipnorm
        
        # Build the model
        self.model = self._build_model()
        optimizer_obj = self._get_optimizer()
        self.model.compile(optimizer=optimizer_obj, loss=self._get_loss())
        
        # Internal state for prediction
        self.context_history = []
        #self.normalization_params = None
        
    def _build_model(self) -> keras.Model:
        """
        Build TiDE neural network architecture.
        
        Returns:
            Compiled Keras model
        """
        inputs = keras.Input(shape=(self.lookback, self.in_features))
        x_flat = layers.Flatten()(inputs)
        x = layers.Dense(self.hidden_dim, activation="relu")(x_flat)
        x = layers.Dense(self.hidden_dim, activation="relu")(x)
        x = layers.Dense(self.hidden_dim * 2, activation="relu")(x)
        flat_output = layers.Dense(self.horizon * self.out_features)(x)
        residual_flat = layers.Dense(self.horizon * self.out_features)(x_flat)
        out = layers.Add()([flat_output, residual_flat])
        outputs = layers.Reshape((self.horizon, self.out_features))(out)

        model = keras.Model(inputs=inputs, outputs=outputs)
        return model
    
    def _get_optimizer(self):
        optimizer_kwargs = {'learning_rate': self.learning_rate}
        if self.clipnorm is not None:
            optimizer_kwargs['clipnorm'] = self.clipnorm
        optimizer_map = {
            'adam': keras.optimizers.Adam,
            'sgd': keras.optimizers.SGD,
            'rmsprop': keras.optimizers.RMSprop,
            'adagrad': keras.optimizers.Adagrad,
            'adadelta': keras.optimizers.Adadelta,
        }
        optimizer_class = optimizer_map.get(self.optimizer.lower(), keras.optimizers.Adam)
        return optimizer_class(**optimizer_kwargs)

    def _get_loss(self):
        return keras.losses.MeanSquaredError()
    
    def _get_memory_usage(self) -> float:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 ** 2)
    
    def train(
        self,
        inputs: NDArray[np.float32],   # [Batch * Context Size * In Features]
        truths: NDArray[np.float32]    # [Batch * Horizon * Out Features]
    ) -> Tuple[float, float, float]:
        """
        Returns:
            Tuple of (Avg RAM usage in MB, Avg Latency in seconds, MAE)
        """
        batch_size = inputs.shape[0]
        
        # Track memory and time
        mem_before = self._get_memory_usage()
        start_time = time.time()
        
        # Train on batch (single epoch for the batch)
        history = self.model.fit(
            inputs, 
            truths,
            batch_size=self.batch_size,
            epochs=self.epochs,
            verbose=0,
            validation_split=0.0  # No validation during batch training
        )
        
        end_time = time.time()
        mem_after = self._get_memory_usage()
        
        predictions = self.model.predict(inputs, verbose=0)
        y_pred = predictions  # [Batch, Horizon, Out Features]
        mae = np.mean(np.abs(truths - y_pred))
        
        avg_memory = (mem_before + mem_after) / 2
        latency = (end_time - start_time) / batch_size
        
        return avg_memory, latency, mae
    
    def predict(
        self,
        input: NDArray[np.float32],     # [In Features]
        truth: NDArray[np.float32]      # [Out Features]
    ) -> Tuple[float, float, float, NDArray[np.float32]]:
        """
        Predicts the next horizon using stored context (past inputs + truths).
        Returns:
            Tuple of (RAM usage in MB, Latency in seconds, Error, Predictions [Horizon * Out Features])
        """
        # Update context history
        self.context_history.append(input)
        if len(self.context_history) > self.lookback:
            self.context_history.pop(0)
        
        # If we don't have enough context yet, return zeros
        if len(self.context_history) < self.lookback:
            return (
                0.0,
                0.0,
                float('inf'),
                np.zeros((self.horizon, self.out_features), dtype=np.float32)
            )
        
        # Prepare input sequence [1, lookback, num_features]
        input_sequence = np.array(self.context_history[-self.lookback:], dtype=np.float32)
        input_batch = np.expand_dims(input_sequence, axis=0)
        
        mem_usage = self._get_memory_usage()
        start_time = time.time()
        
        prediction = self.model.predict(input_batch, verbose=0)  # [1, horizon, out features]
        latency = time.time() - start_time
        
        y_pred = prediction[0, :, :]  # [horizon * out features]
        
        # Calculate error (for the first step if horizon > 1)
        error = np.abs(truth - y_pred[0])
        
        return mem_usage, latency, error, y_pred