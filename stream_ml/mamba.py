import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import time
import psutil
import os
from typing import Tuple, List, Optional
from numpy.typing import NDArray
from stream_ml.model import BaseModel as StreamBaseModel
from pydantic import BaseModel as PydanticBaseModel, Field


class MambaConfig(PydanticBaseModel):
    in_features: int = Field(..., gt=0)
    out_features: int = Field(..., gt=0)
    horizon: int = Field(1, gt=0)
    lookback: int = Field(30, gt=0)
    d_model: int = Field(64, gt=0)
    d_state: int = Field(16, gt=0)
    d_conv: int = Field(4, gt=0)
    expand: int = Field(2, gt=0)
    learning_rate: float = Field(0.001)
    epochs: int = Field(1, gt=0)
    batch_size: int = Field(32, gt=0)


class MambaBlock(nn.Module):
    def __init__(self, d_model, d_state=16, d_conv=4, expand=2):
        super().__init__()
        self.d_inner = int(expand * d_model)
        self.dt_rank = list(range(1, 16 + 1))[-1]
        if self.d_inner < 16: self.dt_rank = 1

        self.in_proj = nn.Linear(d_model, self.d_inner * 2)
        self.conv1d = nn.Conv1d(
            in_channels=self.d_inner, out_channels=self.d_inner,
            kernel_size=d_conv, padding=d_conv - 1, groups=self.d_inner
        )
        self.x_proj = nn.Linear(self.d_inner, self.dt_rank + d_state * 2)
        self.dt_proj = nn.Linear(self.dt_rank, self.d_inner)

        A = torch.arange(1, d_state + 1, dtype=torch.float32).repeat(self.d_inner, 1)
        self.A_log = nn.Parameter(torch.log(A))
        self.D = nn.Parameter(torch.ones(self.d_inner))
        self.out_proj = nn.Linear(self.d_inner, d_model)
        self.act = nn.SiLU()

    def forward(self, x):
        # x: [B, L, D]
        (b, l, d) = x.shape
        x_and_res = self.in_proj(x)  # [B, L, 2*d_inner]
        (x, res) = x_and_res.split(split_size=[self.d_inner, self.d_inner], dim=-1)

        x = x.transpose(1, 2)
        x = self.conv1d(x)[:, :, :l]
        x = x.transpose(1, 2)
        x = self.act(x)

        ssm_out = self.ssm(x)
        y = ssm_out * self.act(res) # Multiplicative gate
        return self.out_proj(y)

    def ssm(self, x):
        # A simple parallel scan/recurrence implementation
        # x: [B, L, d_inner]
        (d_in, n) = self.A_log.shape
        A = -torch.exp(self.A_log.float())  # [d_inner, n]
        D = self.D.float()

        x_dbl = self.x_proj(x)  # [B, L, dt_rank + 2*n]
        (delta, B, C) = x_dbl.split(
            split_size=[self.dt_rank, n, n], dim=-1
        ) # delta: [B,L,dt_rank], B:[B,L,n], C:[B,L,n]

        delta = F.softplus(self.dt_proj(delta)) # [B, L, d_inner]

        # Scan (Simplified recurrence for readability/compatibility)
        y = []
        h = torch.zeros(x.size(0), self.d_inner, n, device=x.device)

        for t in range(x.size(1)):
            dt = delta[:, t, :].unsqueeze(-1) # [B, d_inner, 1]
            dA = torch.exp(dt * A)           # [B, d_inner, n]
            dB = dt * B[:, t, :].unsqueeze(1)# [B, d_inner, n]

            # h_t = A_bar * h_{t-1} + B_bar * x_t
            xt = x[:, t, :].unsqueeze(-1)    # [B, d_inner, 1]
            h = dA * h + dB * xt

            # y_t = C_t * h_t
            Ct = C[:, t, :].unsqueeze(1)     # [B, 1, n]
            yt = torch.sum(h * Ct, dim=-1)   # [B, d_inner]
            y.append(yt)

        y = torch.stack(y, dim=1) # [B, L, d_inner]
        return y + x * D

class MambaModel(StreamBaseModel, nn.Module):
    def __init__(
        self,
        in_features: int,
        out_features: int,
        horizon: int = 1,
        lookback: int = 30,
        d_model: int = 64,
        d_state: int = 16,
        d_conv: int = 4,
        expand: int = 2,
        learning_rate: float = 0.001,
        epochs: int = 1,
        batch_size: int = 32
    ):
        nn.Module.__init__(self)
        self.in_features = in_features
        self.out_features = out_features
        self.horizon = horizon
        self.lookback = lookback
        self.d_model = d_model
        self.d_state = d_state
        self.d_conv = d_conv
        self.expand = expand
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.batch_size = batch_size

        # Build the model layers
        self.embedding = nn.Linear(in_features, d_model)
        self.mamba1 = MambaBlock(d_model, d_state, d_conv, expand)
        self.mamba2 = MambaBlock(d_model, d_state, d_conv, expand)
        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Linear(d_model, horizon * out_features)

        self.optimizer = torch.optim.Adam(self.parameters(), lr=learning_rate)
        self.criterion = nn.MSELoss()  # MSE for better gradient flow

        # Internal state for prediction (sliding window)
        self.context_history = []
        
        # Move to GPU if available
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.to(self.device)

    def _get_memory_usage(self) -> float:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 ** 2)

    def _forward_pass(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [Batch, Seq, Features]
        Returns:
            [Batch, Horizon, Out Features]
        """
        x = self.embedding(x)
        x = self.mamba1(x)
        x = self.mamba2(x)
        x = self.norm(x)
        # Take the last token output and project to horizon * out_features
        out = self.head(x[:, -1, :])  # [Batch, horizon * out_features]
        out = out.view(-1, self.horizon, self.out_features)  # [Batch, Horizon, Out Features]
        return out

    def train(
        self,
        inputs: NDArray[np.float32],   # [Batch * Context Size * In Features]
        truths: NDArray[np.float32]    # [Batch * Horizon * Out Features]
    ) -> Tuple[float, float, float]:
        """
        Returns:
            Avg RAM usage (MB),
            Avg Latency (seconds),
            MAE
        """
        self.training = True  # Set training mode
        batch_size = inputs.shape[0]

        x_tensor = torch.tensor(inputs, dtype=torch.float32).to(self.device)
        y_tensor = torch.tensor(truths, dtype=torch.float32).to(self.device)

        mem_before = self._get_memory_usage()
        start_time = time.time()

        total_loss = 0.0
        num_batches = 0

        for epoch in range(self.epochs):
            for i in range(0, batch_size, self.batch_size):
                batch_x = x_tensor[i:i + self.batch_size]
                batch_y = y_tensor[i:i + self.batch_size]

                self.optimizer.zero_grad()
                preds = self._forward_pass(batch_x)  # [Batch, Horizon, Out Features]
                loss = self.criterion(preds, batch_y)
                loss.backward()
                # Gradient clipping for stability
                torch.nn.utils.clip_grad_norm_(self.parameters(), max_norm=1.0)
                self.optimizer.step()

                total_loss += loss.item()
                num_batches += 1

        end_time = time.time()
        mem_after = self._get_memory_usage()

        # Calculate MAE on full batch
        with torch.no_grad():
            predictions = self._forward_pass(x_tensor)
            mae = torch.mean(torch.abs(predictions - y_tensor)).item()

        avg_memory = (mem_before + mem_after) / 2
        latency = (end_time - start_time) / batch_size

        return avg_memory, latency, mae

    def predict(
        self,
        input: NDArray[np.float32],     # [In Features]
        truth: NDArray[np.float32]      # [Out Features]
    ) -> Tuple[float, float, float, NDArray[np.float32]]:
        """
        Returns:
            RAM usage (MB),
            Latency (seconds),
            Error (based on provided single truth),
            Predictions for full horizon: [Horizon, Out Features]
        """
        self.training = False  # Set eval mode
        
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
        x_tensor = torch.tensor(input_sequence, dtype=torch.float32).unsqueeze(0).to(self.device)

        mem_usage = self._get_memory_usage()
        start_time = time.time()

        with torch.no_grad():
            prediction = self._forward_pass(x_tensor)  # [1, Horizon, Out Features]
        
        latency = time.time() - start_time

        y_pred = prediction[0].cpu().numpy()  # [Horizon, Out Features]

        # Calculate error (for the first step if horizon > 1)
        error = np.mean(np.abs(truth - y_pred[0]))

        return mem_usage, latency, float(error), y_pred