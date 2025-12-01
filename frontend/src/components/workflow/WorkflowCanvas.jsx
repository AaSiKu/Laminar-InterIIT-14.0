import { Box } from "@mui/material";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import { useTheme } from "@mui/material/styles";

const WorkflowCanvas = ({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onInit,
  onDrop,
  onDragOver,
  onPaneClick,
  onCanvasClick,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: 'background.elevation1',
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: 'divider',
        boxShadow: theme.shadows[1],
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
      onClick={onCanvasClick}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        fitView
        fitViewOptions={{ maxZoom: 0.9 }}
      >
        <Controls position="top-right" />
        <Background 
          color={theme.palette.mode === 'dark' ? theme.palette.divider : '#DBE6EB'} 
          gap={16} 
          size={2} 
        />
      </ReactFlow>
    </Box>
  );
};

export default WorkflowCanvas;

