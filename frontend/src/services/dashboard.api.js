

export const fetchFileData = async (fileId) => {
    //make a default prop for inital things
  return {
  "nodes": [
    {
      "id": "1",
      "type": "input",
      "position": { "x": 250, "y": 50 },
      "data": { "label": "Start Node" }
    },
    {
      "id": "2",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "Process A" }
    },
    {
      "id": "3",
      "type": "default",
      "position": { "x": 400, "y": 200 },
      "data": { "label": "Process B" }
    },
    {
      "id": "4",
      "type": "default",
      "position": { "x": 250, "y": 350 },
      "data": { "label": "Decision" }
    },
    {
      "id": "5",
      "type": "output",
      "position": { "x": 250, "y": 500 },
      "data": { "label": "End Node" }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "animated": true,
      "type": "smoothstep"
    },
    {
      "id": "e1-3",
      "source": "1",
      "target": "3",
      "animated": true,
      "type": "smoothstep"
    },
    {
      "id": "e2-4",
      "source": "2",
      "target": "4",
      "label": "Yes"
}]}}