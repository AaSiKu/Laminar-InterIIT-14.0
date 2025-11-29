import { addNodeType } from "./dashboard.utils.jsx";
import { fetchNodeSchema } from "./dashboard.api";

const temporart_PId="692b4d05d4ac6919f809f461"
const temporary_VId="692b4d05d4ac6919f809f460"

const create_pipeline = async(
    setCurrentPipelineId,
    setCurrentVersionId,
    setError,
    setLoading,) => {
  setLoading(true);
  try{
    const response = await fetch(`${import.meta.env.VITE_API_SERVER}/version/create_pipeline`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create pipeline: ${errText || response.status}`);
    }

    const data = await response.json();
    if (data.pipeline_id) {
      setCurrentPipelineId(data.pipeline_id);
    }
    if (data.version_id) {
      setCurrentVersionId(data.version_id);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

const savePipelineAPI = async (
    rfInstance,
    currentPipelineId,
    setCurrentPipelineId,
    currentVersionId,
    setCurrentVersionId,
    setError,
    setLoading,
    versionDescription="") => {
  if (!rfInstance) return;

  setLoading(true);
  setError(null);

  try {
    const flow = rfInstance.toObject();
    console.log(flow);

    const response = await fetch(`${import.meta.env.VITE_API_SERVER}/version/save`, {
      method: "POST",
      credentials: "include", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pipeline_id: temporart_PId||currentPipelineId,
        current_version_id: currentVersionId||temporary_VId,
        version_description: versionDescription||"",
        version_updated_at: Date.now(),
        pipeline: flow,
      }),
    });

    console.log("Save response:", response);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to save pipeline: ${errText || response.status}`);
    }

    const data = await response.json();
    console.log("Save succcessful:", data);

    if (data.pipeline_id) {
      setCurrentPipelineId(data.pipeline_id);
      console.log("SET PIPELINE ID:", data.pipeline_id);
      console.log("CURRENT PIPELINE ID:", currentPipelineId);
    }
    if (data.version_id) {
      setCurrentVersionId(data.version_id);
      console.log("SET VERSION ID:", data.version_id);
      console.log("CURRENT VERSION ID:", data.version_id);
    }
  } catch (err) {
    console.error("Save failed:", err);

    setError(err.message);
  } finally {
    setLoading(false);
  }
};

async function fetchAndSetPipeline(pipeline_id, version_id, setters) {
  const {
    setCurrentPipelineId,
    setCurrentVersionId,
    setError,
    setLoading,
    setCurrentEdges,
    setCurrentNodes,
    setViewport,
    setCurrentPipelineStatus,
    setContainerId,
  } = setters;

  setLoading(true);
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/version/retrieve_pipeline`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipeline_id: temporart_PId||pipeline_id,
      version_id: version_id||temporary_VId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Unable to fetch file, status: ${res.status}`);
  }
  const result = await res.json();
  const pipeline = result["pipeline"];
  const version = result["version"];
  if (version && version["version_id"]) {
    setCurrentVersionId(version["version_id"]);
  }
  if (pipeline && pipeline["pipeline_id"]) {
    setCurrentPipelineId(pipeline["pipeline_id"]);
  }
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
  setLoading(false);
  return result;
}

async function toggleStatus(id, currentStatus) {
  const endpoint = currentStatus ? 'stop' : 'run';
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/pipeline/${endpoint}`, {
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
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/pipeline/spinup`, {
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
  const res = await fetch(`${import.meta.env.VITE_API_SERVER}/pipeline/spindown`, {
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
  create_pipeline,
};
