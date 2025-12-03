from stream_ml.model import BaseModel, BaseModelConfig
from stream_ml.arf import ArfRegressor
from stream_ml.tide import TiDEModel
from stream_ml.mamba import MambaModel
from numpy.typing import NDArray
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import threading
import copy
from concurrent.futures import ThreadPoolExecutor, Future
import logging

logger = logging.getLogger(__name__)

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
        max_concurrent_training: int = 2,
    ):
        self.channel_list = channel_list
        self.model_name = model_name.lower()
        self.config = config
        self.max_concurrent_training = max_concurrent_training
        self.indices = None
        self.model = self._create_model()
        self.buffered_rows = [] # only 'channel list' columns
        
        # Async training infrastructure
        self._model_lock = threading.Lock()
        self._training_executor = ThreadPoolExecutor(max_workers=max_concurrent_training)
        self._active_training_count = 0
        self._training_count_lock = threading.Lock()
        self._pending_futures: List[Future] = []

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
    
    def _copy_model(self) -> BaseModel:
        """
        Create a deep copy of the current model for async training.
        """
        with self._model_lock:
            return copy.deepcopy(self.model)
    
    def _prepare_training_data(self, buffered_rows: List[NDArray]) -> Tuple[NDArray, NDArray]:
        """
        Prepare X_input and y_output from buffered rows.
        """
        X_input = []
        y_output = []
        for index in range(self.config.lookback - 1, len(buffered_rows) - self.config.horizon):
            context = []
            horizon = []
            # Context: [index - lookback + 1, ..., index]
            for i in range(index - self.config.lookback + 1, index + 1):
                context.append(buffered_rows[i])
            # Horizon: [index + 1, ..., index + horizon]
            for i in range(index + 1, index + 1 + self.config.horizon):
                horizon.append(buffered_rows[i])
            
            context = np.array(context).reshape(-1, len(self.channel_list)) # lookback x n_channels
            horizon = np.array(horizon).reshape(-1, len(self.channel_list)) # horizon x n_channels
            X_input.append(context)
            y_output.append(horizon)
        
        X_input = np.array(X_input, dtype=np.float32) # batch x lookback x n_channels
        y_output = np.array(y_output, dtype=np.float32) # batch x horizon x n_channels
        return X_input, y_output
    
    def _async_train_task(self, model_copy: BaseModel, buffered_rows: List[NDArray]) -> Tuple[float, float, float]:
        """
        Async training task that runs in a background thread.
        Trains the copied model and swaps it with the current model upon completion.
        """
        try:
            X_input, y_output = self._prepare_training_data(buffered_rows)
            ram_usage, latency, mae = model_copy.train(X_input, y_output)
            
            # Swap the trained model with the current model
            with self._model_lock:
                self.model = model_copy
            
            logger.info(f"Async training complete. RAM: {ram_usage:.2f}MB, Latency: {latency:.2f}s, MAE: {mae:.4f}")
            return ram_usage, latency, mae
        except Exception as e:
            logger.error(f"Async training failed: {e}")
            raise
        finally:
            with self._training_count_lock:
                self._active_training_count -= 1
    
    def _check_train(self, row : NDArray[np.float32]) -> bool: 
        '''
        Checks if the buffer has enough rows to trigger async training.
        Returns True if training was triggered, False otherwise.
        '''
        self.buffered_rows.append(row)
        if len(self.buffered_rows) >= self.config.batch_size + self.config.horizon + self.config.lookback - 1:
            # Check if we can spawn a new training session
            with self._training_count_lock:
                if self._active_training_count >= self.max_concurrent_training:
                    logger.warning(f"Max concurrent training limit ({self.max_concurrent_training}) reached. Dropping training batch.")
                    self.buffered_rows = self.buffered_rows[self.config.batch_size:]
                    return False
                self._active_training_count += 1
            
            # Copy model and buffer for async training
            model_copy = self._copy_model()
            buffered_rows_copy = list(self.buffered_rows)  # Shallow copy of the list, arrays are immutable
            
            # Slice original buffer to retain only necessary rows for future context
            self.buffered_rows = self.buffered_rows[self.config.batch_size:]
            
            # Submit async training task
            future = self._training_executor.submit(
                self._async_train_task,
                model_copy,
                buffered_rows_copy
            )
            self._pending_futures.append(future)
            
            # Cleanup completed futures
            self._pending_futures = [f for f in self._pending_futures if not f.done()]
            
            logger.info(f"Async training triggered. Active sessions: {self._active_training_count}")
            return True
        return False

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
        
        # Use lock to safely access model during prediction
        with self._model_lock:
            ram_usage, latency, error, predictions = self.model.predict(data_array)
        
        training_triggered = self._check_train(data_array) # trigger async training if buffer fills up

        kwargs['model_ram_usage'] = ram_usage
        kwargs['model_latency'] = latency
        kwargs['model_error'] = error
        kwargs['model_prediction'] = predictions[-1, :].tolist()  # Return only the last horizon step predictions
        kwargs['model_training_triggered'] = training_triggered
        kwargs['model_active_training_sessions'] = self._active_training_count

        return kwargs
    
    def shutdown(self, wait: bool = True) -> None:
        """
        Gracefully shutdown the training executor.
        Call this when the wrapper is no longer needed.
        """
        self._training_executor.shutdown(wait=wait)
        logger.info("Training executor shutdown complete.")
    
    def get_training_status(self) -> Dict[str, Any]:
        """
        Returns the current status of async training.
        """
        with self._training_count_lock:
            return {
                "active_training_sessions": self._active_training_count,
                "max_concurrent_training": self.max_concurrent_training,
                "pending_futures": len(self._pending_futures),
            }
            