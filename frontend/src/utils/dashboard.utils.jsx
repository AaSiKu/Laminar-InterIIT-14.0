import { BaseNode } from "../components/BaseNode";

// TODO: As the nodeTypes is a in memory, it is lost when i leave the page for some time,
// hence the ui resets to simple rectangle box
export const nodeTypes = {};

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

  const type = schema.properties.node_id.const;

  if (!nodeTypes[type]) addNodeType(schema);

  // TODO: Random position to better method
  const node = {
    id: `n${nodes.length + 1}`,
    type: type,
    position: { x: Math.random() * 300, y: Math.random() * 300 },
    node_id: schema.properties.node_id.const,
    category: schema.properties.category.const,
    data,
  };

  return node;
};

const addNodeType = (schema) => {
  const type = schema.properties.node_id.const;

  nodeTypes[type] = (props) => {
    const { id, data, selected } = props;

    const nInputs = schema.properties.n_inputs?.const || 0;
    const categoryColor = hashColor(
      schema.properties.category.const == "io"
        ? schema.properties.n_inputs.const
          ? "output"
          : "input"
        : schema.properties.category.const
    );
    console.log(type)

    return (
      <BaseNode
        id={id}
        data={data}
        selected={selected}
        styles={{
          bgColor: categoryColor + "20", // translucent fill
          hoverBgColor: categoryColor + "35",
          color: categoryColor, // text color
          borderColor: categoryColor,
        }}
        inputs={
          nInputs > 0
            ? Array.from({ length: nInputs }).map((_, i) => ({
                id: `in_${i}`,
                color: "#9E9E9E",
              }))
            : []
        }
        outputs={
          ["io", "action"].includes(schema.properties.category?.const) &&
          schema.properties.n_inputs?.const == 1
            ? []
            : [
                { id: "out", color: "#4CAF50" }, // Green
              ]
        }
        properties={data.properties}
      />
    );
  };
};

const hashColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `#${((hash >> 24) & 0xff).toString(16).padStart(2, "0")}${(
    (hash >> 16) &
    0xff
  )
    .toString(16)
    .padStart(2, "0")}${((hash >> 8) & 0xff)
    .toString(16)
    .padStart(2, "0")}`.slice(0, 7);
};
