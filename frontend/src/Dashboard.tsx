import { useState, useCallback, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  NodeTypes,
} from "@xyflow/react";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Paper,
  ThemeProvider,
  createTheme,
} from "@mui/material";

const theme = createTheme({
  palette: {
    primary: { main: "#3b82f6" },
    secondary: { main: "#10b981" },
    background: { default: "#f9fafb", paper: "#fff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    fontWeightMedium: 600,
  },
});

interface MuiNodeProps {
  data: { label: string };
}

const MuiNode = memo(({ data }: MuiNodeProps) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        minWidth: 140,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 2,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Typography variant="body1">{data.label}</Typography>
      <Box
        sx={{
          mt: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: "secondary.light",
          color: "white",
          fontSize: "0.75rem",
        }}
      >
        MUI Box inside
      </Box>
      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
});

const nodeTypes: NodeTypes = { muiNode: MuiNode };

export default function Dashboard() {
  const initialNodes: Node[] = [
    {
      id: "n1",
      type: "muiNode",
      position: { x: 0, y: 0 },
      data: { label: "Node 1" },
    },
    {
      id: "n2",
      type: "muiNode",
      position: { x: 200, y: 100 },
      data: { label: "Node 2" },
    },
  ];

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "n1", target: "n2", animated: true },
  ];

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((es) => addEdge({ ...params, animated: true }, es)),
    []
  );

  const handleAddNode = () => {
    const id = `n${nodes.length + 1}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "muiNode",
        position: { x: Math.random() * 300, y: Math.random() * 300 },
        data: { label: `Node ${nodes.length + 1}` },
      },
    ]);
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: "100vw", height: "100vh", bgcolor: "background.default" }}>
        <AppBar
          position="static"
          color="inherit"
          elevation={1}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            height: "15vh",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6" color="text.primary">
              My Flow Editor
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" onClick={handleReset}>
                Reset
              </Button>
              <Button variant="contained" onClick={handleAddNode}>
                + Add Node
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ height: "85vh" }}>
          <ReactFlow
          panOnDrag={false}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <MiniMap
              nodeColor={(n) =>
                n.id === "n1" ? theme.palette.primary.main : theme.palette.secondary.main
              }
              style={{ background: "#fff" }}
            />
            <Controls />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
