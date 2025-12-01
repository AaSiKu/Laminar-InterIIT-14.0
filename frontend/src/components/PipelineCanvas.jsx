import { useState, useCallback } from "react";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShareIcon from "@mui/icons-material/Share";
import AddIcon from "@mui/icons-material/Add";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import { PropertyBar } from "./PropertyBar";
import { NodeDrawer } from "./NodeDrawer";
import { nodeTypes, generateNode } from "../utils/dashboard.utils";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  spinupPipeline,
  spindownPipeline,
} from "../utils/pipelineUtils";
import { fetchNodeSchema } from "../utils/dashboard.api";

const PipelineCanvas = ({ 
  pipelineName = "New Pipeline", 
  onBack, 
  isNewPipeline = false,
  showTopBar = true,
}) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pipelineId, setPipelineId] = useState(null);
  const [versionId, setVersionId] = useState(null);
  const [containerId, setContainerId] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(false);

  const onNodesChange = useCallback(
    (changes) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((es) => addEdge({ ...params, animated: true }, es)),
    []
  );

  const handleAddNode = (schema) => {
    setNodes((prev) => [...prev, generateNode(schema, nodes)]);
  };

  const handleToggleStatus = async () => {
    if (!pipelineId || !containerId) return;
    setLoading(true);
    setError(null);
    try {
      const newStatus = await togglePipelineStatus(pipelineId, pipelineStatus);
      setPipelineStatus(newStatus["status"]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpinup = async () => {
    if (!pipelineId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await spinupPipeline(pipelineId);
      setContainerId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpindown = async () => {
    if (!pipelineId || !containerId) return;
    setLoading(true);
    setError(null);
    try {
      await spindownPipeline(pipelineId);
      setContainerId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    savePipelineAPI(
      rfInstance,
      pipelineId,
      setPipelineId,
      versionId,
      setVersionId,
      setError,
      setLoading
    );
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const handleUpdateProperties = (nodeId, data) => {
    setNodes((nds) =>
      nds.map((n) =>
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
      if (!nodeName || !rfInstance) return;

      try {
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const schema = await fetchNodeSchema(nodeName);
        const newNode = generateNode(schema, nodes);
        newNode.position = position;
        setNodes((prev) => [...prev, newNode]);
      } catch (err) {
        console.error("Failed to add node:", err);
        setError("Failed to add node. Please try again.");
      }
    },
    [rfInstance, nodes]
  );

  const handleShareClick = (event) => {
    setShareAnchorEl(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareAnchorEl(null);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Navigation Bar */}
      {showTopBar && (
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.elevation1",
            zIndex: 1300,
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
            {/* Left Section - Back and Pipeline Name */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {onBack && (
                <IconButton
                  onClick={onBack}
                  sx={{
                    color: "text.primary",
                    "&:hover": { bgcolor: "action.hover" },
                    padding: "6px",
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </IconButton>
              )}

              <Typography
                variant="body1"
                sx={{
                  color: "text.primary",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  ml: onBack ? 1 : 0,
                }}
              >
                {pipelineName}
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
                  bgcolor: "action.selected",
                  color: "text.primary",
                  "&:hover": { bgcolor: "action.hover" },
                  width: 32,
                  height: 32,
                  borderRadius: "6px",
                }}
              >
                <ShareIcon sx={{ fontSize: 18 }} />
              </IconButton>

              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={loading}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
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
                disabled={loading || !pipelineId || !!containerId}
                sx={{
                  bgcolor: "action.selected",
                  color: "text.primary",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  py: 0.75,
                  minHeight: "32px",
                  borderRadius: "6px",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "action.hover",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "action.disabledBackground",
                    color: "text.disabled",
                  },
                }}
              >
                Spin Up
              </Button>

              <Button
                variant="contained"
                onClick={handleSpindown}
                disabled={loading || !pipelineId || !containerId}
                sx={{
                  bgcolor: "action.selected",
                  color: "text.primary",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2,
                  py: 0.75,
                  minHeight: "32px",
                  borderRadius: "6px",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "action.hover",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "action.disabledBackground",
                    color: "text.disabled",
                  },
                }}
              >
                Spin Down
              </Button>

              <Button
                variant="contained"
                onClick={handleToggleStatus}
                disabled={loading || !pipelineId || !containerId}
                sx={{
                  bgcolor: "action.selected",
                  color: "text.primary",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  px: 2.5,
                  py: 0.75,
                  minHeight: "32px",
                  borderRadius: "6px",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "action.hover",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "action.disabledBackground",
                    color: "text.disabled",
                  },
                }}
              >
                {pipelineStatus ? "Stop" : "Run"}
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Canvas Area */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          bgcolor: "background.paper",
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
            bgcolor: "background.elevation1",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            width: "100%",
            height: "100%",
          }}
          onClick={(e) => {
            if (
              e.target.classList.contains("react-flow__pane") ||
              e.target.classList.contains("react-flow__renderer")
            ) {
              setSelectedNode(null);
            }
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
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
            bgcolor: "action.selected",
            borderRadius: "8px",
            padding: "4px 8px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{
              bgcolor: "background.paper",
              color: "text.primary",
              "&:hover": { bgcolor: "action.hover" },
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
              bgcolor: "text.secondary",
              mx: 0.3,
            }}
          />

          <IconButton
            onClick={() => console.log("Undo clicked")}
            sx={{
              color: "text.primary",
              "&:hover": { bgcolor: "action.hover" },
              width: 30,
              height: 30,
              borderRadius: "6px",
            }}
          >
            <UndoIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <IconButton
            onClick={() => console.log("Redo clicked")}
            sx={{
              color: "text.primary",
              "&:hover": { bgcolor: "action.hover" },
              width: 30,
              height: 30,
              borderRadius: "6px",
            }}
          >
            <RedoIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Node Drawer */}
      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
        setNodes={setNodes}
        zIndex={10000}
      />

      {/* Property Bar */}
      <PropertyBar
        open={Boolean(selectedNode)}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProperties={handleUpdateProperties}
        zIndex={10000}
      />

      {/* Error Snackbar */}
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
    </Box>
  );
};

export default PipelineCanvas;

