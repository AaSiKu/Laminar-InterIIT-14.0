
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
  console.log(schema)
  if (!schema?.properties) return { ui: { label: "Unknown Node", iconUrl: "ABC" }, properties: [] };

  const props = schema.properties;
  const filteredKeys = Object.keys(props).filter(
    (key) => key !== "category" && key !== "node_id" && key!=="n_inputs"
  );

  const properties = filteredKeys.map((key,idx) => {
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
      type: prop.type || "string",
    };
  });

  const data={
    ui: {
      label: `${schema.title || schema.node_id || "Unnamed"} Node`,
      iconUrl: "ABC",
    },
    properties,
  }

  const node={
          id:`n${nodes.length + 1}`,
          type:schema.properties.n_inputs.const?"out":"in",
          position: { x: Math.random() * 300, y: Math.random() * 300 },
          node_id: schema.properties.node_id,
          category: schema.properties.category,
          data
        }
  return node;
};
