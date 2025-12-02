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
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Fab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShareIcon from "@mui/icons-material/Share";
import AddIcon from "@mui/icons-material/Add";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import LanguageIcon from "@mui/icons-material/Language";
import logo from "../assets/logo.svg";
import { PropertyBar } from "../components/PropertyBar";
import { NodeDrawer } from "../components/NodeDrawer";
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
//TODO: need to fix this logic for setting status to Broken/Running/Stopped
function toggleStatusLogic(variable) {
  return variable;
}

export default function WorkflowPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const navigate = useNavigate();

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
        {/* Top Bar - Laminar Branding */}
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: "1px solid #e5e7eb",
            bgcolor: "#ffffff",
            zIndex: 1301,
            position: "relative",
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              height: "48px",
              justifyContent: "space-between",
              px: 3,
              minHeight: "48px !important",
            }}
          >
            {/* Laminar Logo */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <img
                src={logo}
                alt="Laminar"
                style={{ height: "20px", width: "auto" }}
              />
            </Box>

            {/* Right Side - User Avatar */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "#e0e7ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#5b21b6",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                U
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Second Bar - Pipeline Navigation */}
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: "1px solid #e5e7eb",
            bgcolor: "#F7FAFC",
            zIndex: 1300,
            position: "relative",
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              height: "48px",
              justifyContent: "space-between",
              px: 3,
              minHeight: "48px !important",
            }}
          >
            {/* Left Section - Logo and Pipeline Name */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton
                onClick={handleBackClick}
                sx={{
                  color: "#374151",
                  "&:hover": { bgcolor: "#e5e7eb" },
                  padding: "6px",
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 20 }} />
              </IconButton>

              <Typography
                variant="body1"
                sx={{
                  color: "#1f2937",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  ml: 1,
                }}
              >
                Pipeline A
              </Typography>
            </Box>

            {/* Right Section - Action Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              {loading && <CircularProgress size={18} />}

              <IconButton
                onClick={handleShareClick}
                sx={{
                  bgcolor: "#C3D3DB",
                  color: "#1f2937",
                  "&:hover": { bgcolor: "#b0c4cd" },
                  width: 32,
                  height: 32,
                  borderRadius: "6px",
                }}
              >
                <ShareIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Button
                variant="outlined"
                onClick={() =>
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
                disabled={loading}
              >
                Save
              </Button>

              <Menu
                anchorEl={shareAnchorEl}
                open={Boolean(shareAnchorEl)}
                onClose={handleShareClose}
              >
                <MenuItem onClick={handleShareClose}>Share Link</MenuItem>
                <MenuItem onClick={handleShareClose}>Export</MenuItem>
              </Menu>

              <Button
                variant="contained"
                onClick={handleSpinup}
                disabled={loading || !currentPipelineId || !!containerId}
                sx={{
                  bgcolor: "#C3D3DB",
                  color: "#1f2937",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  py: 0.75,
                  minHeight: "32px",
                  borderRadius: "6px",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#b0c4cd",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                Spin Up
              </Button>

              <Button
                variant="contained"
                onClick={handleSpindown}
                disabled={loading || !currentPipelineId || !containerId}
                sx={{
                  bgcolor: "#C3D3DB",
                  color: "#1f2937",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  py: 0.75,
                  minHeight: "32px",
                  borderRadius: "6px",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#b0c4cd",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                Spin Down
              </Button>

              <Button
                variant="contained"
                onClick={handleToggleStatus}
                disabled={loading || !currentPipelineId || !containerId}
                sx={{
                  bgcolor: "#C3D3DB",
                  color: "#1f2937",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2.5,
                  py: 0.75,
                  minHeight: "32px",
                  borderRadius: "6px",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#b0c4cd",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                {currentPipelineStatus ? "Stop" : "Run"}
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            height: "calc(100vh - 96px)",
            width: "100%",
            bgcolor: "#ffffff",
            position: "relative",
            padding: "16px",
            display: "flex",
            alignItems: "stretch",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              flex: 1,
              bgcolor: "#F7FAFC",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid #ffffff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              width: "100%",
              height: "100%",
            }}
            onClick={(e) => {
              // Close PropertyBar when clicking on workspace
              // Only if clicking on the canvas, not on nodes or controls
              if (
                e.target.classList.contains("react-flow__pane") ||
                e.target.classList.contains("react-flow__renderer")
              ) {
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
              defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
              fitView
              fitViewOptions={{ maxZoom: 0.9 }}
            >
              <Controls position="top-right" />
              <Background color="#DBE6EB" gap={16} size={2} />
            </ReactFlow>
          </Box>

          {/* Bottom Toolbar */}
          <Box
            sx={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 0.5,
              bgcolor: "#C3D3DB",
              borderRadius: "8px",
              padding: "4px 8px",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
              zIndex: 1000,
            }}
          >
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{
                bgcolor: "#F7FAFC",
                color: "#1f2937",
                "&:hover": { bgcolor: "#e5e7eb" },
                width: 30,
                height: 30,
                borderRadius: "6px",
              }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <Box
              sx={{
                width: "1px",
                bgcolor: "#9ca3af",
                mx: 0.3,
              }}
            />

            <IconButton
              onClick={() => {
                // Undo functionality - placeholder for now
                console.log("Undo clicked");
              }}
              sx={{
                color: "#374151",
                "&:hover": { bgcolor: "#b0c4cd" },
                width: 30,
                height: 30,
                borderRadius: "6px",
              }}
            >
              <UndoIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <IconButton
              onClick={() => {
                // Redo functionality - placeholder for now
                console.log("Redo clicked");
              }}
              sx={{
                color: "#374151",
                "&:hover": { bgcolor: "#b0c4cd" },
                width: 30,
                height: 30,
                borderRadius: "6px",
              }}
            >
              <RedoIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
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


/**
   <Button
      variant="outlined"
      onClick={()=>{

        const pipelineId = "All"; // or "abc123" for a specific pipeline
        const wsUrl = `ws://localhost:8081/ws/pipeline/${pipelineId}`;
        const ws = new WebSocket(wsUrl);
        ws.onopen=()=>{console.log("ench")}
        ws.onmessage = (event) => {
            console.log("Notification received:", event.data);
        };

      }  }
      >
      test
    </Button>

 */