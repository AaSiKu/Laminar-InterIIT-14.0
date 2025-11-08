import { InNode } from "../components/NodeTypes/InNode";
import { OutNode } from "../components/NodeTypes/OutNode";
import { ProcessXNode } from "../components/NodeTypes/ProcessXNode";
import { DecisionNode } from "../components/NodeTypes/DecisionNode";
export const nodeTypes = {
  in: InNode,
  out: OutNode,
  processX: ProcessXNode,
  decision: DecisionNode,
  output: OutNode,
};

export const generateNode = (schema, nodes) => {
  const props = schema.properties;
  const filteredKeys = Object.keys(props).filter(
    (key) => key !== "category" && key !== "node_id" && key !== "n_inputs"
  );

  // Extract the values
  const properties = filteredKeys.map((key, idx) => {
    const prop = props[key];
    const value =
      prop.const !== undefined
        ? prop.const
        : prop.default !== undefined
        ? prop.default
        : "";

    return {
      label: key,
      value,
      type: prop.type || (key === "table_schema" ? "json" : "str"),
    };
  });

  const data = {
    ui: {
      label: `${schema.title || schema.node_id || "Unnamed"} Node`,
      iconUrl: "",
    },
    properties,
  };

  const node = {
    id: `n${nodes.length + 1}`,
    type: schema.properties.n_inputs.const ? "out" : "in",
    position: { x: Math.random() * 300, y: Math.random() * 300 },
    node_id: schema.properties.node_id.const,
    category: schema.properties.category.const,
    data,
  };
  return node;
};
