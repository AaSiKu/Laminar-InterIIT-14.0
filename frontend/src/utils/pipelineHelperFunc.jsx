async function savePipelineAPI(flow, currentPipelineId, path) {
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/save`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipeline_id: currentPipelineId,
      path: path || "/",
      pipeline: flow,
    }),
  });
  if (!res.ok) {
    throw new Error( `Unable to save file, statusCode: ${res.status}`);
  }
  return await res.json();
}

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

export {
  savePipelineAPI,
  fetchAndSetPipeline,
  toggleStatus,
  spinupPipeline,
  spindownPipeline,
};
