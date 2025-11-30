import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { PropertyBar } from "../components/PropertyBar";
import { NodeDrawer } from "../components/NodeDrawer";
import { nodeTypes, generateNode } from "../utils/dashboard.utils";
import { useGlobalContext } from "../context/GlobalContext";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  fetchAndSetPipeline,
  spinupPipeline,
  spindownPipeline,
} from "../utils/pipelineUtils";
import { fetchNodeSchema } from "../utils/dashboard.api";

export default function WorkflowPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const {
    currentEdges,
    currentNodes,
    setCurrentNodes,
    setRfInstance,
    setCurrentEdges,
    currentPipelineStatus,
    setCurrentPipelineStatus,
    currentPipelineId,
    rfInstance,
    setCurrentPipelineId,
    dashboardSidebarOpen,
    loading,
    setLoading,
    error,
    setError,
    setViewport,
    containerId,
    setContainerId,
  } = useGlobalContext();

  useEffect(() => {
    if (currentPipelineId) {
      setLoading(true);
      fetchAndSetPipeline(currentPipelineId, {
        setCurrentEdges,
        setCurrentNodes,
        setViewport,
        setCurrentPipelineStatus,
        setContainerId,
      })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [
    currentPipelineId,
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
        newStatus["status"] === "stopped" ? false : true
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

  const handleUpdateProperties = (nodeId, updatedProps) => {
    setCurrentNodes((nds) =>
      nds.map((n, idx) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, properties: updatedProps } }
          : n
      )
    );
    setSelectedNode(null);
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();

      const nodeName = event.dataTransfer.getData('application/reactflow');
      
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
        console.error('Failed to add node:', err);
        setError('Failed to add node. Please try again.');
      }
    },
    [rfInstance, currentNodes, setCurrentNodes, setError]
  );

  const drawerWidth = 64 + (dashboardSidebarOpen ? 325 : 0);

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
        }}
      >
        <AppBar
          position="static"
          color="inherit"
          elevation={1}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            zIndex: 1300,
            position: "relative",
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              height: "6vh",
              justifyContent: "end",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "end",
                alignContent: "center",
              }}
            >
              {loading && <CircularProgress size={24} />}
              <Button
                variant="outlined"
                onClick={() =>
                  savePipelineAPI(
                    currentPipelineId,
                    rfInstance,
                    currentPipelineId,
                    setCurrentPipelineId,
                    setLoading,
                    setError
                  )
                }
                disabled={loading}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={handleSpinup}
                disabled={loading || !currentPipelineId || !!containerId}
              >
                Spin Up
              </Button>
              <Button
                variant="outlined"
                onClick={handleToggleStatus}
                disabled={loading || !currentPipelineId || !containerId}
              >
                {currentPipelineStatus ? "Stop" : "Run"}
              </Button>
              <Button
                variant="outlined"
                onClick={handleSpindown}
                disabled={loading || !currentPipelineId || !containerId}
              >
                Spin Down
              </Button>
              <Button variant="contained" onClick={() => setDrawerOpen(true)}>
                {" "}
                + Add Node
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box 
          sx={{ height: "87vh", bgcolor: "#F7FAFC" }}
          onClick={(e) => {
            // Close PropertyBar when clicking on workspace
            // Only if clicking on the canvas, not on nodes or controls
            if (e.target.classList.contains('react-flow__pane') || 
                e.target.classList.contains('react-flow__renderer')) {
              setSelectedNode(null);
            }
          }}
        >
          <ReactFlow
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
            defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
            fitView
            fitViewOptions={{ maxZoom: 0.9 }}
          >
            <Controls position="top-right" />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
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
