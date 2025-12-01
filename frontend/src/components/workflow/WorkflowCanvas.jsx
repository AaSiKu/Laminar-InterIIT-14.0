import { Box } from "@mui/material";
import { ReactFlow, Background, Controls, ControlButton } from "@xyflow/react";
import { useTheme } from "@mui/material/styles";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";

const WorkflowCanvas = ({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onInit,
  onDrop,
  onDragOver,
  onPaneClick,
  onCanvasClick,
  nodesDraggable = true,
  nodesConnectable = true,
  elementsSelectable = true,
  onFullscreenClick,
  isLocked = false,
  onLockToggle,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: 'background.elevation1',
        borderRadius: 0,
        overflow: "hidden",
        border: "none",
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
        onConnect={isLocked ? undefined : onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onInit={onInit}
        onDrop={isLocked ? undefined : onDrop}
        onDragOver={isLocked ? undefined : onDragOver}
        onPaneClick={onPaneClick}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        fitView
        fitViewOptions={{ maxZoom: 0.9 }}
      >
        <Controls position="top-right" showInteractive={false}>
          {onLockToggle && (
            <ControlButton onClick={onLockToggle} title={isLocked ? "Unlock" : "Lock"}>
              {isLocked ? <LockIcon /> : <LockOpenIcon />}
            </ControlButton>
          )}
          {onFullscreenClick && (
            <ControlButton onClick={onFullscreenClick} title="Enter Fullscreen">
              <OpenInFullIcon />
            </ControlButton>
          )}
        </Controls>
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

