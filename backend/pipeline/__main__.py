import os
from dotenv import load_dotenv
import pathway as pw

load_dotenv()

from .agentic import build_agentic_graph
from .graph_reader import read_and_validate_graph
from .graph_builder import build_computational_graph
from .agentic_setup import (
    setup_trigger_tables,
    setup_prompt_table,
    combine_answer_tables,
    persist_answers
)
from postgres_util import connection_string


# TODO: Fix setup tools deprecation warnings
# TODO: Fix numpy v1 vs v2 conflicts warnings 
# TODO: Fix beartype warnings

pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])


class Prompt(pw.Schema):
    prompt: str


def main():
    """Main execution function for the pipeline."""
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

    # TODO: Implement logging (appending) to a file output and error handling
    # which will be stored/sent to the frontend for all cases
    pw.run()


if __name__ == "__main__":
    main()


