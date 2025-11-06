import { useState, useCallback, memo, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
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
  Typography,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Alert
} from "@mui/material";
import { fetchFileData } from "./services/dashboard.api";
import { PropertyBar } from './components/PropertyBar';
import { NodeDrawer } from "./components/NodeDrawer";
// AnalyticsDialog is NOT imported
import {nodeTypes, generateNode} from "./utils/dashboard.utils"


export function Dashboard({dashboardSidebarOpen,nodes, setNodes,edges, setEdges }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedNode, setSelectedNode] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);  
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [flowObjectId, setFlowObjectId] = useState(null); 
  const navigate = useNavigate(); // Initialize navigate

  // onSave with try...catch to prevent crashing
  const onSave = async (e) => {
    e.preventDefault();
    if (!rfInstance) return; 

    try {
      const flow = rfInstance.toObject();
      console.log("clicked");

      const res = await fetch("http://localhost:8081/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({"path":"/","graph": flow}),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server responded with ${res.status}: ${errorText}`);
      }

      const data = await res.json(); 
      
      if (data.id) { 
        setFlowObjectId(data.id);
      }
      console.log(data);

    } catch (error) {
      console.error("Failed to save flow:", error);
      alert("Error saving flow: " + error.message); 
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('react-flow-data');
        if (result) {
          const data = JSON.parse(result.value);
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.id) {
            setFlowObjectId(data.id);
          }
        } else {
          await loadFlowFromAPI('default');
        }
      } catch {
        await loadFlowFromAPI("default");
      }
    };
    
    loadData();
  }, [setNodes, setEdges]); // Added dependencies

  const loadFlowFromAPI = async (fileId) => {
    try {
      const flowData = await fetchFileData(fileId);
      
      if (flowData && flowData.nodes && flowData.edges) {
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
        
        setFlowObjectId(flowData.id || fileId); 
      }
    } catch (error) {
      console.error("Failed to load flow from API:", error);
    }
  };
  
  const onNodesChange = useCallback(
    (changes) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((es) => applyEdgeChanges(changes, es)),
    [setEdges]
  );
  const onConnect = useCallback(
    (params) => setEdges((es) => addEdge({ ...params, animated: true }, es)),
    [setEdges]
  );

  const handleAddNode = (schema) => {
    setNodes((prev) => [...prev,generateNode(schema,nodes)]);
  };

  const onNodeDoubleClick = (event, node) => {
    event.preventDefault();
    setSelectedNode(node);
  };

  const handleUpdateProperties = (nodeId, updatedProps) => {
    setNodes((nds) =>
      nds.map((n,idx) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, properties: updatedProps } }
          : n
      )
    );
  };

  const drawerWidth = 64 + (dashboardSidebarOpen && !isMobile ? 325 : 0);

  // Click handler for the Analytics button
  const handleAnalyticsClick = () => {
    if (flowObjectId) {
      navigate(`/analytics/${flowObjectId}`);
    } else {
      alert("Please save the flow first to get an ID.");
    }
  };

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
              
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleAnalyticsClick} // Use navigate
                disabled={!flowObjectId} 
              >
                Analytics
              </Button>
              <Button
                variant="contained"
                onClick={() => setDrawerOpen(true)}
              >
                + Add Node
              </Button>
            </Box>

          </Toolbar>
        </AppBar>

        <Box sx={{ height: "87vh", bgcolor: "white" }}>
        
        <button className="xy-theme__button" onClick={onSave}>
          save
        </button>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onInit={setRfInstance}
            fitView
          >
            <Controls position="top-right"/>
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </Box>
      </Box>
      
      {/* Side drawers */}
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

      {/* AnalyticsDialog is GONE */}
    </>
  );
}