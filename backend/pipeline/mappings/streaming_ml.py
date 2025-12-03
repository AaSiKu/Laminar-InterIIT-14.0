import pathway as pw
import numpy as np
import asyncio
from typing import List, Union, Dict, Any
from .helpers import MappingValues
from lib.tables.stream_ml import ARFNode, TiDENode, MambaNode, _StreamingMLNode
from stream_ml.wrapper import ModelWrapper
from stream_ml.arf import ArfConfig
from stream_ml.tide import TiDEConfig
from stream_ml.mamba import MambaConfig


class PredictionOutputSchema(pw.Schema):
    result : Dict[str, Any]


def _create_arf_config(node: ARFNode) -> ArfConfig:
    n_features = len(node.channel_list)
    return ArfConfig(
        in_features=n_features,
        out_features=n_features,
        horizon=node.horizon,
        lookback=node.lookback,
        batch_size=node.batch_size,
        epochs=node.epochs,
        max_concurrent_training=node.max_concurrent_training,
        # ARF-specific params
        n_models=node.n_models,
        max_depth=node.max_depth,
        seed=node.seed,
    )


def _create_tide_config(node: TiDENode) -> TiDEConfig:
    n_features = len(node.channel_list)
    return TiDEConfig(
        in_features=n_features,
        out_features=n_features,
        horizon=node.horizon,
        lookback=node.lookback,
        batch_size=node.batch_size,
        epochs=node.epochs,
        max_concurrent_training=node.max_concurrent_training,
        # TiDE-specific params
        hidden_dim=node.hidden_dim,
        optimizer=node.optimizer,
        learning_rate=node.learning_rate,
        clipnorm=node.clipnorm,
    )


def _create_mamba_config(node: MambaNode) -> MambaConfig:
    n_features = len(node.channel_list)
    return MambaConfig(
        in_features=n_features,
        out_features=n_features,
        horizon=node.horizon,
        lookback=node.lookback,
        batch_size=node.batch_size,
        epochs=node.epochs,
        max_concurrent_training=node.max_concurrent_training,
        # Mamba-specific params
        d_model=node.d_model,
        num_layers=node.num_layers,
        d_state=node.d_state,
        d_conv=node.d_conv,
        expand=node.expand,
        learning_rate=node.learning_rate,
    )


def _create_model_wrapper(
    node: _StreamingMLNode, 
    model_name: str
) -> ModelWrapper:
    
    if model_name == "arf":
        config = _create_arf_config(node)
    elif model_name == "tide":
        config = _create_tide_config(node)
    elif model_name == "mamba":
        config = _create_mamba_config(node)
    else:
        raise ValueError(f"Unknown model name: {model_name}")
    
    return ModelWrapper(
        channel_list=node.channel_list,
        model_name=model_name,
        config=config,
        max_concurrent_training=node.max_concurrent_training
    )


class PredictAsyncTransformer(pw.AsyncTransformer, output_schema=PredictionOutputSchema):
    model_wrapper: ModelWrapper
    all_columns: List[str]
    
    def __init__(self, model_wrapper: ModelWrapper, all_columns: List[str], **kwargs):
        self.model_wrapper = model_wrapper
        self.all_columns = all_columns
        super().__init__(**kwargs)
    
    async def invoke(self, **kwargs) -> Dict[str, Any]:
        result = self.model_wrapper.invoke(**kwargs)
        return {
            "result": result
        }


def _create_training_subscriber(model_wrapper: ModelWrapper, all_columns: List[str]):
    def on_change(key, row, time, is_addition):
        if is_addition:
            # Build kwargs from the row data
            kwargs = {col: row.get(col) for col in all_columns if col in row}
            model_wrapper.check_train(**kwargs)
    
    return on_change

def _apply_streaming_ml(input_table: pw.Table, node: _StreamingMLNode, model_name: str) -> pw.Table:
    """
    1. Create model wrapper
    2. Subscribe to input table for training (calls check_train on each new row)
    3. Apply AsyncTransformer for predictions with complete consistency
    4. Return table with model outputs
    """
    model_wrapper = _create_model_wrapper(node, model_name)
    all_columns = list(input_table.schema.column_names())
    
    # Subscribe to input table for training - this calls check_train on each new row
    training_callback = _create_training_subscriber(model_wrapper, all_columns)
    pw.io.subscribe(input_table, on_change=training_callback)
    
    prediction_transformer = PredictAsyncTransformer(
        model_wrapper,
        all_columns,
        input_table=input_table,
        instance = 0
    )
    
    # Use .successful to get results (filters out failed predictions)
    prediction_results = prediction_transformer.successful
    
    output_columns = ["model_prediction", "model_latency", "model_ram_usage", "model_error"]
    
    # Unpack the result dict into separate columns
    flattened_results = prediction_results.select(
        model_prediction=pw.this.result["model_prediction"],
        model_latency=pw.this.result["model_latency"],
        model_ram_mb=pw.this.result["model_ram_mb"],
        model_error=pw.this.result["model_error"],
    )
    
    final_result = input_table.join(
        flattened_results,
        pw.left.id == pw.right.id,
    ).select(
        *[pw.left[col] for col in all_columns],
        model_prediction=pw.right.model_prediction,
        model_latency=pw.right.model_latency,
        model_ram_mb=pw.right.model_ram_mb,
        model_error=pw.right.model_error,
    )
    
    return final_result


def arf_node_fn(inputs: List[pw.Table], node: ARFNode) -> pw.Table:
    """ARF (Adaptive Random Forest) streaming ML node function"""
    return _apply_streaming_ml(inputs[0], node, "arf")


def tide_node_fn(inputs: List[pw.Table], node: TiDENode) -> pw.Table:
    """TiDE (Time-series Dense Encoder) streaming ML node function"""
    return _apply_streaming_ml(inputs[0], node, "tide")


def mamba_node_fn(inputs: List[pw.Table], node: MambaNode) -> pw.Table:
    """Mamba (State Space Model) streaming ML node function"""
    return _apply_streaming_ml(inputs[0], node, "mamba")


ml_mappings: dict[str, MappingValues] = {
    "arf_ml": {"node_fn": arf_node_fn},
    "tide_ml": {"node_fn": tide_node_fn},
    "mamba_ml": {"node_fn": mamba_node_fn},
}