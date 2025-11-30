from stream_ml.model import BaseModel
from stream_ml.arf import ArfRegressor
from stream_ml.tide import TiDEModel
from stream_ml.mamba import MambaModel
from numpy.typing import NDArray
from typing import Tuple, Dict, Any, List, Optional
import numpy as np

# This file works as a wrapper

class ModelWrapper:
    """
    Wrapper class for managing multiple streaming models with configurable input/output channels.
    """
    
    MODEL_REGISTRY = {
        'arf': ArfRegressor,
        'tide': TiDEModel,
        'mamba': MambaModel,
    }
    
    def __init__(
        self,
        num_channels: int, # Total number of data channels in the stream
        stream_indices: List[int], # Subset indices of channels to be forecasted(same input and output for horizon>1)
        model_name: str,
        config: Dict[str, Any],
    ):
        self.num_channels = num_channels
        self.input_stream_indices = stream_indices
        self.output_stream_indices = stream_indices
        self.model_name = model_name.lower()
        self.config = config
        
        self._validate_indices()
        self.model = self._create_model()
        
    def _validate_indices(self) -> None:
        all_indices = set(self.input_stream_indices + self.output_stream_indices)
        if any(idx < 0 or idx >= self.num_channels for idx in all_indices):
            raise ValueError(
                f"Stream indices must be between 0 and {self.num_channels - 1}"
            )
    
    def _create_model(self) -> BaseModel:
        if self.model_name not in self.MODEL_REGISTRY:
            raise ValueError(
                f"Unknown model '{self.model_name}'. "
                f"Available models: {list(self.MODEL_REGISTRY.keys())}"
            )
        
        model_class = self.MODEL_REGISTRY[self.model_name]
        return model_class(**self.config)
    
    def _extract_streams(self, data: NDArray, indices: List[int], axis: int = -1) -> NDArray:
        return data[..., indices] if axis == -1 else data[indices, ...]
    
    def train(self, X: NDArray, y: NDArray) -> Tuple[float, float, float]:
        """
        Args:
            X: Input data array of shape (Batch_size, Context, n_channels)
            y: Truth data array of shape (Batch_size, Horizon, n_channels)
        Returns:
            Tuple of (Avg RAM usage, Avg Latency, MAE)
        """
        X_input = self._extract_streams(X, self.input_stream_indices)
        y_output = self._extract_streams(y, self.output_stream_indices)
        return self.model.train(X_input, y_output)
    
    def predict(self, X: NDArray, Y: NDArray) -> Tuple[float, float, float, NDArray[np.float32]]:
        """
        Args:
            X: Input data array of shape (n_channels)
            Y: Truth data array of shape (n_channels)
        Returns:
            Tuple of (RAM usage, Latency, Error, Predictions : [Horizon * Out Features])
        """
        X_input = self._extract_streams(X, self.input_stream_indices)
        Y_output = self._extract_streams(Y, self.output_stream_indices)
        return self.model.predict(X_input, Y_output)