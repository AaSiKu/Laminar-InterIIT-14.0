import { memo } from "react";
import { Box, Paper } from "@mui/material";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";

const WorkflowCanvas = ({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
}) => (
  <Paper
    elevation={0}
    sx={{
      flexGrow: 1,
      borderRadius: 3,
      overflow: "hidden",
      border: "1px solid rgba(30, 58, 138, 0.2)",
      position: "relative",
      minHeight: { xs: 480, lg: 560 },
      display: "flex",
      p: { xs: 2, lg: 2.5 },
      backgroundColor: (theme) =>
        theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(248, 250, 252, 1)",
      boxShadow: (theme) =>
        theme.palette.mode === "dark"
          ? "0 4px 18px rgba(0, 0, 0, 0.45)"
          : "0 6px 26px rgba(30, 58, 138, 0.06)",
    }}
  >
    <Box
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: (theme) => `1px solid ${theme.palette.divider}`,
        flex: 1,
        display: "flex",
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
        fitView
        style={{ width: "100%", height: "100%" }}
      >
        <Background gap={22} color="#e5e7eb" />
        <MiniMap
          nodeColor={(node) =>
            node.data?.status === "complete"
              ? "#22c55e"
              : node.data?.status === "unvisited"
              ? "#ef4444"
              : "#f97316"
          }
          position="bottom-right"
        />
        <Controls position="top-right" />
      </ReactFlow>
    </Box>
  </Paper>
);

export default memo(WorkflowCanvas);

