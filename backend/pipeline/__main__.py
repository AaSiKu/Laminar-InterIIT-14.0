import os
import json
import logging
from typing import Any
from dotenv import load_dotenv
import pathway as pw
load_dotenv()
from .logger import custom_logger
from .agentic import build_agentic_graph
from .graph_reader import read_and_validate_graph
from .graph_builder import build_computational_graph, persist_table_to_postgres
from .agentic_setup import (
    setup_trigger_tables,
    setup_prompt_table,
    combine_answer_tables,
    persist_answers
)
from postgres_util import connection_string
from .metric_node import find_special_column_sources
from .mappings import trigger_rca
from .mappings.open_tel.prefix import is_special_column

# Document store imports
from pathway.xpacks.llm.document_store import DocumentStore
from pathway.xpacks.llm.servers import DocumentStoreServer
from pathway.xpacks.llm import embedders
from pathway.stdlib.indexing import BruteForceKnnFactory, BruteForceKnnMetricKind

# TODO: Fix setup tools deprecation warnings
# TODO: Fix numpy v1 vs v2 conflicts warnings 
# TODO: Fix beartype warnings

pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])

class Prompt(pw.Schema):
    prompt: str


# ===== ERROR DOCUMENT STORE HELPERS =====

def parse_json_entry(contents: bytes, **kwargs) -> list[tuple[str, dict[str, Any]]]:
    """
    Custom parser for JSON error entries.
    Treats each JSON entry as a separate chunk for MongoDB exports.
    """
    try:
        data = json.loads(contents.decode('utf-8'))
        
        if isinstance(data, list):
            return _parse_array(data)
        elif isinstance(data, dict):
            return [_parse_single_entry(data, 0)]
        else:
            custom_logger.warning("JSON data is neither list nor dict")
            return []
    except Exception as e:
        custom_logger.error(f"Error parsing JSON: {e}")
        return []


def _parse_array(data: list) -> list[tuple[str, dict]]:
    """Parse array of JSON objects"""
    results = []
    for idx, entry in enumerate(data):
        if isinstance(entry, dict):
            results.append(_parse_single_entry(entry, idx))
    return results


def _parse_single_entry(entry: dict, idx: int, source_name: str = "errors") -> tuple[str, dict]:
    """
    Parse a single JSON entry.
    Extracts first column for semantic matching.
    """
    if entry:
        first_column_name = list(entry.keys())[0]
        text_for_embedding = str(entry.get(first_column_name, ""))
    else:
        text_for_embedding = ""
    
    metadata = {
        "entry_index": idx,
        "full_data": entry,
        "first_column": text_for_embedding,
        "source": source_name
    }
    
    return (text_for_embedding, metadata)


def setup_error_document_store():
    """
    Setup Pathway document store for error indexing.
    Returns DocumentStoreServer instance or None if not configured.
    """
    try:
        errors_json_path = os.getenv("ERRORS_JSON_PATH", "pipeline/errors_table/Errors.json")
        
        # Check if errors JSON file exists
        if not os.path.exists(errors_json_path):
            custom_logger.warning(f"Errors JSON file not found at {errors_json_path}")
            custom_logger.info("Error document store will not be initialized")
            return None
        
        custom_logger.info(f"Initializing error document store from {errors_json_path}")
        
        # Read JSON file
        json_source = pw.io.fs.read(
            path=errors_json_path,
            format="binary",
            with_metadata=True,
        )
        
        # Create embedder
        embedder = embedders.GeminiEmbedder(
            model=os.getenv("EMBEDDING_MODEL", "models/text-embedding-004"),
            api_key=os.getenv("GEMINI_API_KEY")
        )
        
        # Create document store
        document_store = DocumentStore(
            docs=[json_source],
            parser=parse_json_entry,
            splitter=None,
            retriever_factory=BruteForceKnnFactory(
                reserved_space=1000,
                embedder=embedder,
                metric=BruteForceKnnMetricKind.COS,
            ),
        )
        
        # Create server
        host = os.getenv("ERROR_INDEXING_HOST", "0.0.0.0")
        port = int(os.getenv("ERROR_INDEXING_PORT", "8001"))
        
        server = DocumentStoreServer(host, port, document_store)
        custom_logger.info(f"Error document store server initialized on {host}:{port}")
        
        return server
        
    except Exception as e:
        custom_logger.error(f"Failed to setup error document store: {e}")
        return None


def main():
    """Main execution function for the pipeline."""
    try:
        custom_logger.critical("Pipeline starting")
        # Get flowchart file path
        flowchart_file = os.getenv("FLOWCHART_FILE", "flowchart.json")

        # Read and validate the graph
        graph = read_and_validate_graph(flowchart_file)

        # Build the computational graph
        node_outputs = build_computational_graph(
            graph["nodes"],
            graph["parsing_order"],
            graph["dependencies"]
        )

        graph["node_outputs"] = node_outputs
        for metric_node_idx in graph["metric_node_descriptions"].keys():
            graph["metric_node_descriptions"][metric_node_idx]["special_columns_source_indexes"] = {
                col: find_special_column_sources(metric_node_idx,col,graph) for col in node_outputs[metric_node_idx].column_names() if is_special_column(col) and 'trace_id' in col
            }
        trigger_rca_nodes = [ind for ind in range(len(graph["nodes"])) if graph["nodes"][ind].node_id == "trigger_rca"]

        for rca_node_idx in trigger_rca_nodes:
            rca_output_table = trigger_rca(node_outputs[graph["dependencies"][rca_node_idx][0]], graph["nodes"][rca_node_idx], graph)
            persist_table_to_postgres(rca_output_table, graph["nodes"][rca_node_idx], rca_node_idx)
        # Build agentic graph
        graph_name = graph.get("name", "")
        
        supervisor = build_agentic_graph(
            graph["agents"],
            graph_name,
            graph["nodes"],
            node_outputs
        )

        # Setup trigger tables
        answer_tables = setup_trigger_tables(graph, node_outputs, supervisor)

        # Setup prompt input and answers
        # TODO: Shift to a better input connector for prompts
        prompts = pw.io.csv.read("prompts.csv", schema=Prompt, mode="streaming")
        prompt_answers = setup_prompt_table(prompts, supervisor)

        # Combine all answers
        all_answers = combine_answer_tables(prompt_answers, answer_tables)

        # Persist to database
        persist_answers(all_answers, connection_string)
        
        # Setup error document store server (optional)
        error_server = setup_error_document_store()
        
        if error_server:
            error_server.run(threaded=True, with_cache=True, terminate_on_error=False)

        pw.run()
    except Exception as e:
        custom_logger.error(f"Error running pipeline: {e}")


if __name__ == "__main__":
    main()


