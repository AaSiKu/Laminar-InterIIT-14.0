import { addNodeType } from "./dashboard.utils.jsx";
import { fetchNodeSchema } from "./dashboard.api";
const savePipelineAPI = async (path,rfInstance,currentPipelineId,setCurrentPipelineId,setLoading,setError) => {

  if (!rfInstance) return;

  setLoading(true);
  setError(null);

  try {
    const flow = rfInstance.toObject();

    const response = await fetch("http://localhost:8000/save", {
      method: "POST",
      credentials: "include", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pipeline_id: currentPipelineId,
        path: path || "",
        pipeline: flow,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to save pipeline: ${errText || response.status}`);
    }

    const data = await response.json();

    if (!currentPipelineId && data.id) {
      setCurrentPipelineId(data.id);
    }

    console.log("Pipeline saved successfully:", data);
  } catch (err) {
    console.error("Save failed:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

async function fetchAndSetPipeline(id, setters) {
  const {
    setCurrentEdges,
    setCurrentNodes,
    setViewport,
    setCurrentPipelineStatus,
    setContainerId,
  } = setters;
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/retrieve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipeline_id: id
    }),
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch file, status: ${res.status}`);
  }
  const result = await res.json();
  const pipeline = result["pipeline"];
  await add_to_node_types(pipeline?.nodes || []);
  if (pipeline) {
    setCurrentEdges(pipeline["edges"] || []);
    setCurrentNodes(pipeline["nodes"] || []);
    if (pipeline["viewport"]) {
      setViewport(pipeline["viewport"]);
    }
    setCurrentPipelineStatus(result["status"]);
    setContainerId(result["container_id"]);
  }
  return result;
}

async function toggleStatus(id, currentStatus) {
  const endpoint = currentStatus ? 'stop' : 'run';
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline_id: id }),
  });
  if (!res.ok) {
    throw new Error(`Unable to toggle status, status: ${res.status}`);
  }
  return await res.json();
}

async function spinupPipeline(id) {
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/spinup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline_id: id }),
  });
  if (!res.ok) {
    throw new Error(`Unable to spin up pipeline, status: ${res.status}`);
  }
  return await res.json();
}

async function spindownPipeline(id) {
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/spindown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline_id: id }),
  });
  if (!res.ok) {
    throw new Error(`Unable to spin down pipeline, status: ${res.status}`);
  }
  return await res.json();
}

async function add_to_node_types(nodes = []) {
  if (!Array.isArray(nodes) || !nodes.length) return;

  const uniqueNodeIds = Array.from(
    new Set(nodes.map((node) => node?.node_id).filter(Boolean))
  );

  await Promise.all(
    uniqueNodeIds.map(async (nodeId) => {
      const schema = await fetchNodeSchema(nodeId);
      if (schema?.properties?.node_id?.const) {
        addNodeType(schema);
      }
    })
  );
}

export {
  savePipelineAPI,
  fetchAndSetPipeline,
  toggleStatus,
  spinupPipeline,
  spindownPipeline,
};
