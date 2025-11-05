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
import { fetchFileData } from "./services/dashboard.api";
import { BaseNode } from "./components/NodeTypes/BaseNode";
import { PropertyBar } from './components/PropertyBar';
import { InputNode } from "./components/NodeTypes/InputNode";
import { ProcessXNode } from "./components/NodeTypes/ProcessXNode";
import { DecisionNode } from "./components/NodeTypes/DecisionNode";
import { OutputNode } from "./components/NodeTypes/OutputNode";
import { NodeDrawer } from "./components/NodeDrawer";


const nodeTypes = {
  input: InputNode,
  airbyte: InputNode,
  processX: ProcessXNode,
  decision: DecisionNode,
  csv: OutputNode,
  output: OutputNode,
};

export function Dashboard({dashboardSidebarOpen,nodes, setNodes,edges, setEdges }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('react-flow-data');
        if (result) {
          const data = JSON.parse(result.value);
          setNodes(data.nodes);
          setEdges(data.edges);
        } else {
          await loadFlowFromAPI('default');
        }
      } catch {
        await loadFlowFromAPI("default");
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

  const handleAddNode = (Node_type,Node_data) => {
    const id = `n${nodes.length + 1}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: Node_type,
        position: { x: Math.random() * 300, y: Math.random() * 300 },
        data: { ...Node_data, label: `Node ${nodes.length + 1}`},
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

  const onNodeDoubleClick = (event, node) => {
    event.preventDefault();
    setSelectedNode(node);
  };

  const handleUpdateProperties = (nodeId, updatedProps) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, properties: updatedProps } }
          : n
      )
    );
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
            {/* <Button variant="outlined" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => loadFlowFromAPI('your-file-id')}
            >
              Load from API
            </Button> */}

              {/* <Button variant="contained" onClick={handleAddNodeSINP}>
                + Add Node
              </Button> */}
              <Button
                variant="contained"
                onClick={() => setDrawerOpen(true)}
              >
                + Add Node
              </Button>

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
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
          >
            {/* <MiniMap
              nodeColor={(n) =>
                n.id === "n1" ? theme.palette.primary.main : theme.palette.secondary.main
              }
              style={{ background:"white", border:"none", padding: 0, margin: 0 }}
              maskColor="rgba(0, 0, 0, 0.1)"
            /> */}
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
        .react-flow__node.dragging {
          cursor: grabbing !important;
        }
        .react-flow__pane {
          cursor: default !important;
        }
      `}</style>
      
      {/* Right property drawer */}
      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
      />

      <PropertyBar
        open={Boolean(selectedNode)}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProperties={handleUpdateProperties}
      />
    </>
  );
}