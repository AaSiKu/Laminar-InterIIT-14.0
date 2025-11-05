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
