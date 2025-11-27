import { BaseNode } from "../components/BaseNode";

// TODO: As the nodeTypes is a in memory, it is lost when i leave the page for some time,
// hence the ui resets to simple rectangle box
export const nodeTypes = {};

const fixPydanticSchema = (schema) => {
  // Create a deep copy to avoid mutating the original
  const newSchema = JSON.parse(JSON.stringify(schema));

  if (newSchema.properties) {
    Object.keys(newSchema.properties).forEach((key) => {
      const prop = newSchema.properties[key];

      // Check if the property uses 'anyOf', its of 2 length and one of it is null
      if (
        prop.anyOf &&
        Array.isArray(prop.anyOf) &&
        Array.from(prop.anyOf).length == 2
      ) {
        // Find the non-null option (e.g., the string, integer, or array definition)
        const realTypeOption = prop.anyOf.find((opt) => opt.type !== "null");
        // Find if there is a null option (confirming it's just an optional field)
        const hasNullOption = prop.anyOf.some((opt) => opt.type === "null");

        // If we found a real type and a null option, flatten it!
        if (realTypeOption && hasNullOption) {
          delete prop.anyOf; // Remove the dropdown trigger

          // Copy the properties from the real type (type, title, items, format, etc.)
          Object.assign(prop, realTypeOption);

          // Preserve the original title/description if the anyOf option didn't have one
          // (Pydantic usually puts title on the parent, so we are safe)

          // If the default is null, we must remove it because 'null' is not valid
          // for type 'string', 'integer', or 'array' (which we just assigned above).
          if (prop.default === null) {
            delete prop.default;
          }
        }
      }
    });
  }

  return newSchema;
};

export const generateNode = (schema, nodes) => {
  // TODO: later correct the naming of properties fields (currently code is very messy)
  const data = {
    ui: {
      label: `${schema.title || schema.node_id || "Unnamed"} Node`,
      iconUrl: "",
    },
  };

  const type = schema.properties.node_id.const;

  if (!nodeTypes[type]) addNodeType(schema);

  // TODO: Random position to better method
  const node = {
    id: `n${nodes.length + 1}`,
    schema: fixPydanticSchema(schema),
    type: type,
    position: { x: Math.random() * 300, y: Math.random() * 300 },
    node_id: schema.properties.node_id.const,
    category: schema.properties.category.const,
    data,
  };
  return node;
};

export const addNodeType = (schema) => {
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

    const statusStyles = {
      complete: {
        borderColor: "#22c55e",
        bgColor: "#ecfdf5",
        hoverBgColor: "#d1fae5",
        color: "#15803d",
      },
      incomplete: {
        borderColor: "#f97316",
        bgColor: "#fff7ed",
        hoverBgColor: "#fed7aa",
        color: "#c2410c",
      },
      unvisited: {
        borderColor: "#ef4444",
        bgColor: "#fee2e2",
        hoverBgColor: "#fecaca",
        color: "#b91c1c",
      },
      error: {
        borderColor: "#ef4444",
        bgColor: "#fee2e2",
        hoverBgColor: "#fecaca",
        color: "#b91c1c",
      },
    };

    const defaultStyles = {
      bgColor: categoryColor,
      hoverBgColor: categoryColor,
      color: categoryColor,
      borderColor: categoryColor,
    };

    const mergedStyles =
      (data?.status && statusStyles[data.status]) || defaultStyles;

    return (
      <BaseNode
        id={id}
        data={data}
        selected={selected}
        styles={{
          bgColor: categoryColor, // solid color
          hoverBgColor: categoryColor,
          color: categoryColor,
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
  // Category-based color mapping with darker shades
  const categoryColors = {
    // Input nodes (darker blue)
    "input": "#64B5F6",  // Medium blue
    // Output nodes (darker pink/red)
    "output": "#E57373",  // Medium red/pink
    // Table/transformation nodes (darker teal)
    "table": "#4DB6AC",  // Medium teal
    // Windowing nodes (darker orange)
    "temporal": "#FFA726",  // Medium orange
    // Logic/control flow (darker purple)
    "logic": "#BA68C8",  // Medium purple
    // Agent nodes (darker purple)
    "agent": "#9575CD",  // Medium purple
    // Action nodes (darker amber)
    "action": "#FFCA28",  // Medium amber
    // Default fallback
    "default": "#90A4AE",  // Medium grey
  };

  return categoryColors[str] || categoryColors["default"];
};
