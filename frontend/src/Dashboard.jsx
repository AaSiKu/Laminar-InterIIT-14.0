import { useState, useCallback, useEffect } from "react";
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
import { PropertyBar } from "./components/propertyBar";
import { NodeDrawer } from "./components/NodeDrawer";
import { nodeTypes, generateNode } from "./utils/dashboard.utils";
import { useGlobalContext } from "./components/context";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  fetchAndSetPipeline,
  spinupPipeline,
  spindownPipeline,
} from "./utils/pipelineHelperFunc";

export function Dashboard({ dashboardSidebarOpen }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
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
    rfInstance,
    currentPipelineId,
    setCurrentPipelineId,
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

  const onNodeDoubleClick = (event, node) => {
    event.preventDefault();
  };

  const savePipeline = async (path) => {
    if (!rfInstance) return;
    setLoading(true);
    setError(null);
    try {
      const flow = rfInstance.toObject();
      const data = await savePipelineAPI(flow, currentPipelineId, path);
      if (currentPipelineId === null) {
        setCurrentPipelineId(data.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const drawerWidth = 64 + (dashboardSidebarOpen && !isMobile ? 325 : 0);

  return (
    <>
      <Box
        sx={{
          transition: "margin-left 0.3s ease",
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
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              height: "6vh",
              justifyContent: "end",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, justifyContent: "end" }}>
              {loading && <CircularProgress size={24} />}
              <Button
                variant="outlined"
                onClick={() => savePipeline()}
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
        <ReactFlow
          nodes={currentNodes}
          edges={currentEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onInit={setRfInstance}
          fitView
        >
          <Controls position="top-right" />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </Box>

      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
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
