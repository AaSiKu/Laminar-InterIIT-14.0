import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Box,
  Alert,
  Snackbar,
} from "@mui/material";
import { PropertyBar } from "../components/workflow/PropertyBar";
import { NodeDrawer } from "../components/workflow/NodeDrawer";
import { nodeTypes, generateNode } from "../utils/dashboard.utils";
import { useGlobalContext } from "../context/GlobalContext";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  spinupPipeline,
  spindownPipeline,
  saveDraftsAPI,
} from "../utils/pipelineUtils";
import { fetchNodeSchema } from "../utils/dashboard.api";
import TopBar from "../components/TopBar";
import PipelineNavBar from "../components/workflow/PipelineNavBar";
import BottomToolbar from "../components/workflow/BottomToolbar";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
//TODO: need to fix this logic for setting status to Broken/Running/Stopped
function toggleStatusLogic(variable) {
  return variable;
}

export default function WorkflowPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { pipelineId } = useParams();

  const {
    currentEdges,
    currentNodes,
    setCurrentNodes,
    setRfInstance,
    setCurrentEdges,
    currentPipelineStatus,
    setCurrentPipelineStatus,
    setAgentContainerId,
    currentPipelineId,
    rfInstance,
    setCurrentPipelineId,
    loading,
    setLoading,
    error,
    setError,
    setViewport,
    containerId,
    setContainerId,
    currentVersionId,
    setCurrentVersionId,
  } = useGlobalContext();

  useEffect(() => {
    if (currentPipelineId) {
      setLoading(true);

      saveDraftsAPI(
        currentVersionId,
        rfInstance,
        setCurrentVersionId,
        setLoading,
        setError
      )
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [
    currentPipelineId,
    currentVersionId,
    setCurrentEdges,
    setCurrentNodes,
    setViewport,
    setCurrentPipelineStatus,
    setLoading,
    setError,
    setContainerId,
  ]);

  const onNodesChange = useCallback(
    (changes) => setCurrentNodes((ns) => applyNodeChanges(changes, ns)),
    [setCurrentNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => setCurrentEdges((es) => applyEdgeChanges(changes, es)),
    [setCurrentEdges]
  );

  const onConnect = useCallback(
    (params) =>
      setCurrentEdges((es) => addEdge({ ...params, animated: true }, es)),
    [setCurrentEdges]
  );

  const handleAddNode = (schema) => {
    setCurrentNodes((prev) => [...prev, generateNode(schema, currentNodes)]);
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const newStatus = await togglePipelineStatus(
        currentPipelineId,
        currentPipelineStatus
      );
      setCurrentPipelineStatus(
        // newStatus["status"] === "Stopped" ? "" : true
        toggleStatusLogic(newStatus["status"])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpinup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await spinupPipeline(currentPipelineId);
      setContainerId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      console.log(currentPipelineId);
      setLoading(false);
    }
  };

  const handleSpindown = async () => {
    setLoading(true);
    setError(null);
    try {
      await spindownPipeline(currentPipelineId);
      setContainerId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const handleUpdateProperties = (nodeId, data) => {
    setCurrentNodes((nds) =>
      nds.map((n, idx) =>
        n.id === nodeId ? { ...n, data: { ...n.data, properties: data } } : n
      )
    );
    setSelectedNode(null);
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();

      const nodeName = event.dataTransfer.getData("application/reactflow");

      if (!nodeName || !rfInstance) {
        return;
      }

      try {
        // Get the position where the node was dropped
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Fetch the schema for the node
        const schema = await fetchNodeSchema(nodeName);

        // Generate the node with the drop position
        const newNode = generateNode(schema, currentNodes);
        newNode.position = position;

        // Add the node to the canvas
        setCurrentNodes((prev) => [...prev, newNode]);
      } catch (err) {
        console.error("Failed to add node:", err);
        setError("Failed to add node. Please try again.");
      }
    },
    [rfInstance, currentNodes, setCurrentNodes, setError]
  );

  const drawerWidth = 64;

  const handleShareClick = (event) => {
    setShareAnchorEl(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareAnchorEl(null);
  };

  const handleBackClick = () => {
    navigate("/workflows");
  };

  return (
    <>
      <Box
        sx={{
          transition: "margin-left 0.3s ease",
          left: drawerWidth,
          position: "absolute",
          width: `calc(100vw - ${drawerWidth}px)`,
          height: "100vh",
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        {/* <TopBar/> */}

        <PipelineNavBar
          onBackClick={handleBackClick}
          pipelineName={`Pipeline ${pipelineId ? pipelineId.toLowerCase() : 'a'}`}
          loading={loading}
          shareAnchorEl={shareAnchorEl}
          onShareClick={handleShareClick}
          onShareClose={handleShareClose}
          onSave={() =>
            savePipelineAPI( 
              rfInstance,
              currentPipelineId,
              setCurrentPipelineId,
              currentVersionId,
              setCurrentVersionId,
              setError,
              setLoading
            )
          }
          onSpinup={handleSpinup}
          onSpindown={handleSpindown}
          onToggleStatus={handleToggleStatus}
          currentPipelineStatus={currentPipelineStatus}
          currentPipelineId={currentPipelineId}
          containerId={containerId}
        />

        <Box
          sx={{
            height: "calc(100vh - 96px)",
            width: "100%",
            bgcolor: "background.paper",
            position: "relative",
            padding: "4px",
            display: "flex",
            alignItems: "stretch",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <WorkflowCanvas
            nodes={currentNodes}
            edges={currentEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPaneClick={() => setSelectedNode(null)}
            onCanvasClick={(e) => {
              // Close PropertyBar when clicking on workspace
              // Only if clicking on the canvas, not on nodes or controls
              if (
                e.target.classList.contains("react-flow__pane") ||
                e.target.classList.contains("react-flow__renderer")
              ) {
                setSelectedNode(null);
              }
            }}
          />

          <BottomToolbar
            onAddClick={() => setDrawerOpen(true)}
            onUndoClick={() => {
              // Undo functionality - placeholder for now
              console.log("Undo clicked");
            }}
            onRedoClick={() => {
              // Redo functionality - placeholder for now
              console.log("Redo clicked");
            }}
          />
        </Box>
      </Box>

      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
        setNodes={setCurrentNodes}
      />
      <PropertyBar
        open={Boolean(selectedNode)}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProperties={handleUpdateProperties}
      />
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
