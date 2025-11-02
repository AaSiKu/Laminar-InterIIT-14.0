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
  useTheme,
  useMediaQuery,
  Alert
} from "@mui/material";
import { fetchFileData} from "./services/dashboard.api";

export function Dashboard({dashboardSidebarOpen,nodes, setNodes,edges, setEdges }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('react-flow-data');
        if (result) {
          const data = JSON.parse(result.value);
          setNodes(data.nodes);
          setEdges(data.edges);
        } else {
          // If no saved data, load from API
          await loadFlowFromAPI('default');
        }
      } catch (error) {
        console.log('No saved data found');
        await loadFlowFromAPI('default');
      }
    };
    
    loadData();
  }, []);

  const loadFlowFromAPI = async (fileId) => {
    try {
      const flowData = await fetchFileData(fileId);
      
      if (flowData && flowData.nodes && flowData.edges) {
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
      }
    } catch (error) {
      <Alert severity="error">{error}</Alert>
    }
  };

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

  const drawerWidth = 64 + (dashboardSidebarOpen && !isMobile ? 325 : 0);

  return (
    <>
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
            {/* <Button variant="outlined" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => loadFlowFromAPI('your-file-id')}
            >
              Load from API
            </Button> */}
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
            <Controls position="top-right"/>
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </Box>
      </Box>
      
      <style>{`
        .react-flow__minimap {
          border: none !important;
          box-shadow: none !important;
          background: white !important;
        }
        .react-flow__controls {
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          background:rgba(0,0,0,0);
          background: transparent !important;
          box-shadow: none !important;
        }

        .react-flow__controls-button {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }

        /* Zoom In button */
        .react-flow__controls-zoomin {
          background: #3b82f6 !important;
        }
        
        .react-flow__controls-zoomin svg {
          fill: white !important;
        }
        
        /* Zoom Out button */
        .react-flow__controls-zoomout {
          background: #10b981 !important;
        }
        
        .react-flow__controls-zoomout svg {
          fill: white !important;
        }
        
        /* Fit View button */
        .react-flow__controls-fitview {
          background: #f59e0b !important;
        }
        
        .react-flow__controls-fitview svg {
          fill: white !important;
        }
        
        /* Interactive/Lock button */
        .react-flow__controls-interactive {
          background: #ef4444 !important;
        }
        
        .react-flow__controls-interactive svg {
          fill: white !important;
        }
        
        /* Hover states for individual buttons */
        .react-flow__controls-zoomin:hover {
          background: #2563eb !important;
        }
        
        .react-flow__controls-zoomout:hover {
          background: #059669 !important;
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
    </>
  );
}



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
