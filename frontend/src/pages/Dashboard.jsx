import { useState, useCallback, memo, useEffect } from "react";
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
import { PropertyBar } from '../components/PropertyBar';
import { NodeDrawer } from "../components/NodeDrawer";
import {nodeTypes, generateNode} from "../utils/dashboard.utils"
import { useGlobalContext } from "../context/GlobalContext";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  fetchAndSetPipeline,
  spinupPipeline,
  spindownPipeline,
} from "../utils/pipelineUtils";


export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);


  const navigate = useNavigate();
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
      console.log(currentPipelineId)
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

  const handleAnalyticsClick = () => {
    if (currentPipelineId) {
      navigate(`/analytics/${currentPipelineId}`);
    } else {
      setError("Please save the flow first to get an ID.");
    }
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
            <Box sx={{ display: "flex", gap: 2, justifyContent: "end", alignContent: "center" }}>
              {loading && <CircularProgress size={24} />}
              <Button
                variant="outlined"
                onClick={() => savePipelineAPI(currentPipelineId,rfInstance,currentPipelineId,setCurrentPipelineId,setLoading,setError)}
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
              <Button
                variant="outlined"
                onClick={handleAnalyticsClick} // Use navigate
                disabled={!currentPipelineId}
              >
                Analytics
              </Button>
              <Button variant="contained" onClick={() => setDrawerOpen(true)}>
                {" "}
                + Add Node
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ height: "87vh", bgcolor: "white" }}>
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
