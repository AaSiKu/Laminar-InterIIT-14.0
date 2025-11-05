const BACKEND_URL="http://127.0.0.1:8000"//will fetch from env later 
export const fetchFileData = async (fileId) => {
    //make a default prop for inital things
  return {
    nodes: [
      {
        id: "1",
        type: "input",
        position: { x: 250, y: 50 },
        data: {
          label: "Start Node",
          properties: [
            { label: "Name", value: "Start" },
            { label: "Trigger", value: "OnInit" }
          ]
          // ✅ REMOVED styles from data - they're not used here
        }
      },
      {
        id: "2",
        type: "processX",
        position: { x: 100, y: 200 },
        data: {
          label: "Process A",
          properties: [
            { label: "A", value: "10" },
            { label: "B", value: "20" },
            { label: "C", value: "30" }
          ]
        }
      },
      {
        id: "3",
        type: "processX",
        position: { x: 400, y: 200 },
        data: {
          label: "Process B",
          properties: [
            { label: "A", value: "5" },
            { label: "B", value: "15" },
            { label: "C", value: "25" }
          ]
        }
      },
      {
        id: "4",
        type: "decision",
        position: { x: 250, y: 350 },
        data: {
          label: "Decision",
          properties: [
            { label: "Condition", value: "x > 10" },
            { label: "Path", value: "Yes/No" }
          ]
        }
      },
      {
        id: "5",
        type: "output",
        position: { x: 250, y: 500 },
        data: {
          label: "End Node",
          properties: [
            { label: "Result", value: "Complete" }
          ]
        }
      }
    ],

    edges: [
      {
        id: "e1-2",
        source: "1",
        sourceHandle: "out",
        target: "2",
        targetHandle: "x",
        type: "smoothstep",
        animated: true
      },
      {
        id: "e1-3",
        source: "1",
        sourceHandle: "out",
        target: "3",
        targetHandle: "x",
        type: "smoothstep",
        animated: true
      },
      {
        id: "e2-4",
        source: "2",
        sourceHandle: "u",
        target: "4",
        targetHandle: "input1",
        label: "Yes",
        type: "smoothstep",
        animated: true
      },
      {
        id: "e3-4",
        source: "3",
        sourceHandle: "v",
        target: "4",
        targetHandle: "input1",
        label: "No",
        type: "smoothstep",
        animated: true
      },
      {
        id: "e4-5",
        source: "4",
        sourceHandle: "yes",
        target: "5",
        targetHandle: "end",
        type: "smoothstep",
        animated: true
      }
    ]
  };
};
export const fetchNodeTypes = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/schema/all`);
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
    const res = await fetch(`${BACKEND_URL}/schema/${nodeName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const schema = await res.json();
    return schema;
  } catch (err) {
    console.error(`Error fetching schema for ${nodeName}:`, err);
    return null;
  }
};