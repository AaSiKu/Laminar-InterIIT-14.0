import fs from "fs";

export const convertJsonToFlowchart = () => {
  const pipeline = {
    nodes: [
      {
        id: "1",
        type: "input",
        position: { x: 250, y: 50 },
        node_id: "kafka",
        category: "io",
        data: {
          ui: {
            label: "Start Node",
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
        type: "output",
        position: { x: 250, y: 500 },
        node_id: "jsonlines_write",
        category: "io",
        data: {
          ui: {
            label: "End Node",
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
  fs.writeFile("./flowchart.json", JSON.stringify(pipeline), (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log("File saved successfully!");
    }
  });
};

convertJsonToFlowchart();