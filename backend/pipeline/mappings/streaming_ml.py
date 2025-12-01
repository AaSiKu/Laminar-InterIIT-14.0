import pathway as pw
import numpy as np
from typing import List, Union
from .helpers import MappingValues
from lib.tables.stream_ml import ARFNode, TiDENode, MambaNode, _StreamingMLNode
from stream_ml.wrapper import ModelWrapper
from stream_ml.arf import ArfConfig
from stream_ml.tide import TiDEConfig
from stream_ml.mamba import MambaConfig


def _create_arf_config(node: ARFNode) -> ArfConfig:
    n_features = len(node.channel_list)
    return ArfConfig(
        in_features=n_features,
        out_features=n_features,
        horizon=node.horizon,
        lookback=node.lookback,
        batch_size=node.batch_size,
        epochs=node.epochs,
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
    )


def _create_predict_udf(model_wrapper: ModelWrapper, all_columns: List[str]):
    @pw.udf
    def predict_udf(*args) -> pw.Json:
        kwargs = {all_columns[i]: args[i] for i in range(len(all_columns))}
        result = model_wrapper.invoke(**kwargs) # kwargs is whole row, numerical, string, anything
        
        # Clean up output for JSON serialization
        prediction = result.get("model_prediction", None)
        if prediction is not None and hasattr(prediction, 'tolist'):
            prediction = prediction.tolist()  # Convert numpy array to list
        
        error = result.get("model_error", None)
        if error is not None:
            error = float(error) if not np.isinf(error) else None
        
        latency = result.get("model_latency", 0)
        ram = result.get("model_ram_usage", 0)
        
        return pw.Json({
            "prediction": prediction,
            "latency_ms": float(latency) * 1000 if latency else 0.0,
            "ram_mb": float(ram) if ram else 0.0,
            "error": error
        })
    
    return predict_udf


def _apply_streaming_ml(input_table: pw.Table, node: _StreamingMLNode, model_name: str) -> pw.Table:
    """
    1. Create model wrapper
    2. Create UDF for predictions
    3. Apply UDF to input table
    4. Return table with model outputs
    """
    model_wrapper = _create_model_wrapper(node, model_name)
    all_columns = list(input_table.schema.column_names())
    predict_udf = _create_predict_udf(model_wrapper, all_columns)
    all_column_refs = [pw.this[col] for col in all_columns]
    
    result = input_table.with_columns(
        model_output=predict_udf(*all_column_refs)
    )
    
    # Expand JSON output into separate columns alongside original columns
    # Keep all original columns and add model output columns
    final_result = result.with_columns(
        model_prediction=pw.this.model_output["prediction"],
        model_latency_ms=pw.this.model_output["latency_ms"],
        model_ram_mb=pw.this.model_output["ram_mb"],
        model_error=pw.this.model_output["error"],
    ).without(pw.this.model_output)
    
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