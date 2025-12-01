from stream_ml.model import BaseModel, BaseModelConfig
from stream_ml.arf import ArfRegressor
from stream_ml.tide import TiDEModel
from stream_ml.mamba import MambaModel
from numpy.typing import NDArray
from typing import Tuple, Dict, Any, List, Optional
import numpy as np

# This file works as a wrapper

# TODO: Output and Input smoothing during training and after predicting. Add a smoothing factor to config? 

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
        channel_list : List[str],
        model_name: str,
        config: BaseModelConfig,
    ):
        self.channel_list = channel_list
        self.model_name = model_name.lower()
        self.config = config
        self.indices = None
        self.model = self._create_model()
        self.buffered_rows = [] # only 'channel list' columns

    def _create_model(self) -> BaseModel:
        if self.model_name not in self.MODEL_REGISTRY:
            raise ValueError(
                f"Unknown model '{self.model_name}'. "
                f"Available models: {list(self.MODEL_REGISTRY.keys())}"
            )
        
        model_class = self.MODEL_REGISTRY[self.model_name]
        return model_class(**self.config.model_dump())
    
    def _extract_streams(self, data: NDArray, channel_list: List[str]) -> NDArray:
        indices = self.indices
        return data[..., indices]
    
    def _check_train(self, row : NDArray[np.float32]) -> Optional[Tuple[float, float, float]]: 
        '''
        Checks if the buffer has enough rows to trigger training. If so, it extracts the relevant data,
        converts it to numpy arrays, and calls the _train method.
        '''
        self.buffered_rows.append(row)
        if len(self.buffered_rows) >= self.config.batch_size + self.config.horizon + self.config.lookback - 1:
            X_input = []
            y_output = []
            for index, buffered_row in enumerate(self.buffered_rows[self.config.lookback - 1 : -self.config.horizon]):
                context = []
                horizon = []
                for index2 in range(index - self.config.lookback + 1, index + 1):
                    context.append(self.buffered_rows[index2])
                for index3 in range(index + 1, index + 1 + self.config.horizon):
                    horizon.append(self.buffered_rows[index3])
                context = np.array(context).reshape(-1, len(self.channel_list)) # lookback x n_channels
                horizon = np.array(horizon).reshape(-1, len(self.channel_list)) # horizon x n_channels
                X_input.append(context)
                y_output.append(horizon)
            X_input = np.array(X_input, dtype=np.float32) # batch x lookback x n_channels
            y_output = np.array(y_output, dtype=np.float32) # batch x horizon x n_channels
                
            self.buffered_rows = self.buffered_rows[self.config.batch_size:] # retain only necessary rows for context
            return self.model.train(X_input, y_output)

    def invoke(self, **kwargs) -> Dict[str, Any]: 
        '''
        Takes complete table row and outputs updated row with predictions and metrics
        '''

        if(self.indices is None):
            self.indices = [
                i for i, ch in enumerate(kwargs.keys()) if ch in self.channel_list
            ]

        # Validation step
        arr = []
        for key, value in kwargs.items():
            if key in self.channel_list:
                if not isinstance(value, (int, float, np.number)):
                    raise ValueError(f"Value for channel '{key}' must be numerical.")
                arr.append(float(value))
        if len(arr) != len(self.channel_list):
            raise ValueError("Input data does not match the expected channel list.")

        data_array = np.array(arr, dtype=np.float32)
        ram_usage, latency, error, predictions = self.model.predict(data_array)
        train_metrics = self._check_train(data_array) # train if buffer fills up

        kwargs['model_ram_usage'] = ram_usage
        kwargs['model_latency'] = latency
        kwargs['model_error'] = error
        kwargs['model_prediction'] = predictions[-1, :].tolist()  # Return only the last horizon step predictions

        return kwargs
            