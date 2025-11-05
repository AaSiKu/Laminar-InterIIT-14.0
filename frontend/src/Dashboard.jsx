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
import { PropertyBar } from "./components/propertyBar";
import { InNode } from "./components/NodeTypes/InNode";
import { ProcessXNode } from "./components/NodeTypes/ProcessXNode";
import { DecisionNode } from "./components/NodeTypes/DecisionNode";
import { OutNode } from "./components/NodeTypes/OutNode";

const nodeTypes = {
  in: InNode,
  processX: ProcessXNode,
  decision: DecisionNode,
  out: OutNode,
};

export function Dashboard({dashboardSidebarOpen,nodes, setNodes,edges, setEdges }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedNode, setSelectedNode] = useState(null);
  

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

  const onNodeClick = (event, node) => {
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
            onNodeClick={onNodeClick}
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
      {/* Right property drawer */}
      <PropertyBar
        open={Boolean(selectedNode)}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProperties={handleUpdateProperties}
      />
    </>
  );
}