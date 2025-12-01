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
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import { nodeTypes, generateNode } from "../utils/dashboard.utils";
import { NodeDrawer } from "./NodeDrawer";
import { PropertyBar } from "./PropertyBar";
import "../css/workflowcanvas.css";

const WorkflowCanvas = ({ workflowName = "New Workflow", onSave }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState(null);

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

  const handleSave = () => {
    if (onSave) {
      onSave({ nodes, edges });
    }
  };

  return (
    <Box className="workflow-canvas-container">
      {/* Header */}
      <Box className="workflow-canvas-header">
        <Typography className="workflow-canvas-title">
          {workflowName}
        </Typography>
        <Box className="workflow-canvas-actions">
          <Button
            variant="outlined"
            size="small"
            onClick={handleSave}
            className="workflow-canvas-save-btn"
          >
            Save Draft
          </Button>
        </Box>
      </Box>

      {/* Canvas Area */}
      <Box className="workflow-canvas-area">
        <Box className="workflow-canvas-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setRfInstance}
            onPaneClick={() => setSelectedNode(null)}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            fitView
            fitViewOptions={{ maxZoom: 0.9 }}
          >
            <Controls position="top-right" />
            <Background color="#DBE6EB" gap={16} size={2} />
          </ReactFlow>
        </Box>

        {/* Bottom Toolbar */}
        <Box className="workflow-canvas-toolbar">
          <IconButton
            onClick={() => setDrawerOpen(true)}
            className="workflow-canvas-toolbar-btn add-btn"
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <Box className="workflow-canvas-toolbar-divider" />

          <IconButton
            onClick={() => console.log("Undo")}
            className="workflow-canvas-toolbar-btn"
          >
            <UndoIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <IconButton
            onClick={() => console.log("Redo")}
            className="workflow-canvas-toolbar-btn"
          >
            <RedoIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Empty State */}
        {nodes.length === 0 && (
          <Box className="workflow-canvas-empty">
            <Typography className="workflow-canvas-empty-title">
              Start building your workflow
            </Typography>
            <Typography className="workflow-canvas-empty-subtitle">
              Click the + button below to add nodes
            </Typography>
          </Box>
        )}
      </Box>

      {/* Node Drawer */}
      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
        setNodes={setNodes}
      />

      {/* Property Bar */}
      <PropertyBar
        open={Boolean(selectedNode)}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProperties={handleUpdateProperties}
      />
    </Box>
  );
};

export default WorkflowCanvas;

