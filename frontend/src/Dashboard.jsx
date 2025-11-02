import { useState, useCallback, memo, useEffect } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Paper,
  ThemeProvider,
  createTheme,
  useTheme,
  useMediaQuery,
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

const MuiNode = memo(({ data }) => {
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

const nodeTypes = { muiNode: MuiNode };

export function Dashboard({ sidebarOpen, setOpen, dashboardSidebarOpen }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const initialNodes = [
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

  const initialEdges = [
    { id: "e1-2", source: "n1", target: "n2", animated: true },
  ];

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('react-flow-data');
        if (result) {
          const data = JSON.parse(result.value);
          setNodes(data.nodes);
          setEdges(data.edges);
        }
      } catch (error) {
        console.log('No saved data found');
      }
    };
    loadData();
  }, []);

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

  const handleSave = async () => {
    const flowData = { nodes, edges };
    await window.storage.set('react-flow-data', JSON.stringify(flowData));
  };

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
  };

  const drawerWidth = 64 + (dashboardSidebarOpen && !isMobile ? 250 : 0);

  return (
    <>
      <style>{`
        .react-flow__minimap {
          border: none !important;
          box-shadow: none !important;
          background: white !important;
        }
        .react-flow__controls {
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        }
        .react-flow__panel {
          margin: 10px !important;
        }
        .react-flow .react-flow__edges {
          cursor: crosshair !important;
        }
        .react-flow__node {
          cursor: grab !important;
        }
        .react-flow__node.dragging {
          cursor: grabbing !important;
        }
        .react-flow__pane {
          cursor: default !important;
        }
      `}</style>
      
      <Box 
        sx={{ 
          transition: 'margin-left 0.3s ease',
          width: `calc(100vw - ${drawerWidth}px)`,
          height: "100vh", 
          bgcolor: "background.default" 
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
          <Toolbar sx={{ display: "flex", height:"12vh", justifyContent: "space-between" }}>
            <Typography variant="h6" color="text.primary">
              React Flow
            </Typography>
            {/* <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" onClick={handleReset}>
                Reset
              </Button>
              <Button variant="outlined" onClick={handleSave}>
                Save
              </Button>
              <Button variant="outlined" onClick={handleExport}>
                Export
              </Button>
              <Button variant="contained" onClick={handleAddNode}>
                + Add Node
              </Button>
            </Box> */}
          </Toolbar>
        </AppBar>

        <Box sx={{ height: "87vh", bgcolor: "white" }}>
          <ReactFlow
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
              style={{ background:"white", border:"none", padding: 0, margin: 0 }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Controls />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </Box>
      </Box>
    </>
  );
}