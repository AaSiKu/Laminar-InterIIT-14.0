export const fetchFileData = async (fileId) => {
  return {
    nodes: [
      {
        id: "1",
        type: "in",
        position: { x: -300, y: 150 },
        node_id: "http",
        category: "io",
        data: {
          ui: {
            label: "http stream node",
            iconUrl: "ABC",
          },
          properties: [
            { label: "url", value: "host.docker.internal:8000", type: "str" },
            { label: "format", value: "json", type: "str" },
            {
              label: "table_schema",
              value: {
                id: "str",
                email: "str",
                name: "str",
                job: "str",
              },
              type: "json",
            },
          ],
        },
      },
      {
        id: "2",
        type: "out",
        position: { x: 300, y: 150 },
        node_id: "jsonlines_write",
        category: "io",
        data: {
          ui: {
            label: "json file writter",
            iconUrl: "ABC",
          },
          properties: [{ label: "filename", value: "log.output", type: "str" }],
        },
      },
    ],

    edges: [
      {
        id: "e1-2",
        source: "1",
        sourceHandle: "out",
        target: "2",
        targetHandle: "end",
        type: "smoothstep",
        animated: true,
      },
    ],
  };
};
export const fetchNodeTypes = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_SERVER}/schema/all`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching node types:", err);
    return {}; // fallback empty
  }
};

export const fetchNodeSchema = async (nodeName) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_SERVER}/schema/${nodeName}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const schema = await res.json();
    return schema;
  } catch (err) {
    console.error(`Error fetching schema for ${nodeName}:`, err);
    return null;
  }
};
