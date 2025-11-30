import { addNodeType } from "./dashboard.utils.jsx";
import { fetchNodeSchema } from "./dashboard.api";

//Create a pipeline first to avoid the error of using a random id
//TODO: a user should only first create a piepline thn use these fucntion, useing currentPipelineId or version id uses random and undefined values
//----------------------- Create Pipeline--------------------------------//

const create_pipeline = async (
  setCurrentPipelineId,
  setCurrentVersionId,
  setError,
  setLoading
) => {
  setLoading(true);
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_SERVER}/version/create_pipeline`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to create pipeline: ${errText || response.status}`
      );
    }

    const data = await response.json();
    if (data.id && data.version_id) {
      setCurrentPipelineId(data.id);
      setCurrentVersionId(data.version_id);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

//----------------------- Save pipeline and Drafts---------------------------------------//

const savePipelineAPI = async (
  rfInstance,
  currentPipelineId,
  setCurrentPipelineId,
  currentVersionId,
  setCurrentVersionId,
  setError,
  setLoading,
  versionDescription = ""
) => {
  if (!(currentPipelineId && currentVersionId && rfInstance)) {
    return;
  }
  setLoading(true);

  try {
    const flow = rfInstance.toObject();

    const response = await fetch(
      `${import.meta.env.VITE_API_SERVER}/version/save`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline_id: currentPipelineId,
          current_version_id: currentVersionId,
          version_description: versionDescription || "",
          version_updated_at: new Date().toISOString(),
          pipeline: flow,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to save pipeline: ${errText || response.status}`);
    }

    const data = await response.json();

    if (data.pipeline_id) {
      setCurrentPipelineId(data.pipeline_id);
    }
    if (data.version_id) {
      setCurrentVersionId(data.version_id);
    }
  } catch (err) {
    console.error("Save failed:", err);

    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const saveDraftsAPI = async (
  version_id,
  rfInstance,
  setCurrentVersionId,
  setLoading,
  setError,
  description = ""
) => {
  if (!version_id || !rfInstance) {
    setError("Can not save draft");
    setLoading(false);
    return null;
  }

  setLoading(true);
  try {
    const flow = rfInstance.toObject();
    const response = await fetch(
      `${import.meta.env.VITE_API_SERVER}/version/save_draft`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version_id: version_id,
          version_description: description || "",
          pipeline: flow,
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to save draft: ${errText || response.status}`);
    }

    const data = await response.json();

    if (data.version_id) {
      setCurrentVersionId(data.version_id);
    }
  } catch (err) {
    console.error("Save failed:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

//-------------------------------- Retrieve Pipeline at a version---------------------------------//

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

  if (!pipeline_id || !version_id) {
    return;
  }

  setLoading(true);
  const res = await fetch(
    `${import.meta.env.VITE_API_SERVER}/version/retrieve_pipeline`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pipeline_id: pipeline_id,
        version_id: version_id,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Unable to fetch file, status: ${res.status}`);
  }
  const result = await res.json();
  const pipeline = result["pipeline"];
  const version = result["version"];

  if (!pipeline || !version) {
    setLoading(false);
    return null;
  }

  // Extract pipeline data - the pipeline dict has a 'pipeline' key containing the actual flow data
  const pipelineData = pipeline?.pipeline;

  // Get version_id from version object
  if (version) {
    const vid = version["_id"] || version["version_id"];
    if (vid) {
      setCurrentVersionId(String(vid));
    }
  }

  // Get pipeline_id from pipeline object
  if (pipeline) {
    const pid = pipeline["_id"] || pipeline["pipeline_id"];
    if (pid) {
      setCurrentPipelineId(String(pid));
    }
    if (pipeline["status"]) {
      setCurrentPipelineStatus(pipeline["status"]);
    }
    if (pipeline["container_id"]) {
      setContainerId(pipeline["container_id"]);
    }
  }

  if (pipelineData && typeof pipelineData === "object") {
    await add_to_node_types(pipelineData?.nodes || []);
    setCurrentEdges(pipelineData["edges"] || []);
    setCurrentNodes(pipelineData["nodes"] || []);
    if (pipelineData["viewport"]) {
      setViewport(pipelineData["viewport"]);
    }
  }

  setLoading(false);
  return result;
}

//------------------------------Delete Pipeline and Drafts-----------------------------------//

async function deletePipeline(
  pipeline_id,
  currentPipelineId,
  setCurrentPipelineId,
  setCurrentVersionId,
  setContainerId,
  setAgentContainer,
  setCurrentEdges,
  setCurrentNodes,
  setCurrentPipelineStatus,
  setLoading,
  setError
) {
  setLoading(true);
  try {
    if (!pipeline_id) {
      setError("Can not delte pipeline temporarily");
      return null;
    }
    const res = await fetch(
      `${
        import.meta.env.VITE_API_SERVER
      }/version/delete_pipeline?pipeline_id=${pipeline_id}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Unable to delete file, status: ${res.status}`);
    }

    const result = await res.json();
    if (pipeline_id === currentPipelineId) {
      setCurrentPipelineId(null);
      setCurrentEdges([]);
      setCurrentNodes([]);
      setCurrentVersionId(null);
      setCurrentPipelineStatus(null);
    }
    setLoading(false);
    setContainerId(null);
    setAgentContainer(null);
  } catch (err) {
    console.error("delete failed:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

async function deleteDrafts(
  pipeline_id,
  currentPipelineId,
  setCurrentVersionId,
  setCurrentEdges,
  setCurrentNodes,
  setCurrentPipelineStatus,
  setLoading,
  setError
) {
  setLoading(true);
  try {
    if (!pipeline_id) {
      throw new Error("Pipeline ID is required");
    }
    const res = await fetch(
      `${
        import.meta.env.VITE_API_SERVER
      }/version/delete_draft?pipeline_id=${pipeline_id}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (res.ok) {
      if (pipeline_id === currentPipelineId) {
        const result = await res.json();
        const version = result["version"];

        if (version) {
          const pipelineData = version?.pipeline;

          if (result["version_id"]) {
            setCurrentVersionId(String(result["version_id"]));
          }

          if (pipelineData && typeof pipelineData === "object") {
            await add_to_node_types(pipelineData?.nodes || []);
            setCurrentNodes(pipelineData["nodes"] || []);
            setCurrentEdges(pipelineData["edges"] || []);
          }
        }

        setCurrentPipelineStatus(null);
      }
      setLoading(false);
    } else {
      const errText = await res.text();
      throw new Error(`Failed to delete draft: ${errText || res.status}`);
    }
  } catch (err) {
    console.error("delete failed:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

//--------------------------pipeline docker APIs----------------------------------------------//

async function toggleStatus(id, currentStatus) {
  const endpoint = currentStatus ? "stop" : "run";
  const res = await fetch(
    `${import.meta.env.VITE_API_SERVER}/pipeline/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_id: id }),
    }
  );
  if (!res.ok) {
    throw new Error(`Unable to toggle status, status: ${res.status}`);
  }
  return await res.json();
}

async function spinupPipeline(id) {
  const res = await fetch(
    `${import.meta.env.VITE_API_SERVER}/pipeline/spinup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_id: id }),
    }
  );
  if (!res.ok) {
    throw new Error(`Unable to spin up pipeline, status: ${res.status}`);
  }
  return await res.json();
}

async function spindownPipeline(id) {
  const res = await fetch(
    `${import.meta.env.VITE_API_SERVER}/pipeline/spindown`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_id: id }),
    }
  );
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
  saveDraftsAPI,
  deleteDrafts,
  deletePipeline,
};

/**
                 <Button
                variant="outlined"
                onClick={() =>
                  create_pipeline(
                    setCurrentPipelineId,
                    setCurrentVersionId,
                    setError,
                    setLoading,
                )}
                disabled={loading}
              >
                Create Pipeline
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  saveDraftsAPI(
                  currentVersionId,
                  rfInstance,
                  setCurrentVersionId, 
                  setLoading,
                  setError,
                )}
                disabled={loading}
              >
                Save Draft
              </Button>
              <Button
                variant="outlined"
                onClick={() => fetchAndSetPipeline(
                  currentPipelineId, currentVersionId,{
                  setCurrentPipelineId,
                  setCurrentVersionId,
                  setError,
                  setLoading,
                  setCurrentEdges,
                  setCurrentNodes,
                  setViewport,
                  setCurrentPipelineStatus,
                  setContainerId,
                })}
                disabled={loading}
              >
                Fetch
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  deleteDrafts(
                  currentPipelineId,
                  currentPipelineId,
                  setCurrentVersionId,
                  setCurrentEdges,
                  setCurrentNodes,
                  setCurrentPipelineStatus,
                  setLoading,
                  setError
                )}
                disabled={loading}
              >
                Delete Draft
              </Button>
              
 */
