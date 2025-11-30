from abc import ABC, abstractmethod
from typing import Tuple, List, Any
from numpy.typing import NDArray
import numpy as np

#TODO : Check normalization params usage
#TODO : Make the truth in predict optional with default None, and return error as None
#TODO : Remove redundant truth argument in predict, and push to context AFTER predicting

class BaseModel(ABC):
    """
    Abstract base class for time-series or sequence-based models
    supporting initialization, training (run), and prediction.
    """

    @abstractmethod
    def train(
        self,
        inputs: NDArray[np.float32],   # [Batch * Context Size * In Features]
        truths:  NDArray[np.float32]    # [Batch * Horizon * Out Features]
    ) -> Tuple[float, float, float]:
        """
        Trains the model on the given batch inputs.
        Returns:
            Avg RAM usage,
            Avg Latency,
            MAE
        Notes:
            - Number of epochs is provided externally (e.g., flowchart.json).
            - Implementations should compute averages across batches.
        """
        pass

    @abstractmethod
    def predict(
        self,
        input: NDArray[np.float32],     # [In Features]
        truth: NDArray[np.float32]      # [Out Features]
    ) -> Tuple[float, float, float, NDArray[np.float32]]:
        """
        Predicts the next horizon using stored context (past inputs + truths).
        Returns:
            RAM usage,
            Latency,
            Error (based on provided single truth),
            Predictions for full horizon: [Horizon]
        Notes:
            - Implementation may internally maintain history, errors, etc.
            - Should update internal context for next-step predictions.
        """
        pass
