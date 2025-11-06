import { useState, useCallback, memo, useEffect } from "react";
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
import { fetchFileData } from "../services/dashboard.api";
import { PropertyBar } from '../components/PropertyBar';
import { NodeDrawer } from "../components/NodeDrawer";
import {nodeTypes, generateNode} from "../utils/dashboard.utils"


export default function Dashboard({dashboardSidebarOpen,nodes, setNodes,edges, setEdges }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedNode, setSelectedNode] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);  
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onSave = async (e) => {
    e.preventDefault()
    if (rfInstance) {
      const flow = rfInstance.toObject();
      console.log("clicked")

    const res = await fetch("http://localhost:8000/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // send the string wrapped in an object as JSON
      body:  JSON.stringify({"path":"/","graph": flow}) ,
    });

    const data = await res.json();
    console.log(data)
  };
  }

  // const onSave = useCallback(() => {
  //   if (rfInstance) {
  //     const flow = rfInstance.toObject();
  //     console.log("clicked")
  //     // localStorage.setItem(flowKey, JSON.stringify(flow));
  //   }
  // }, [rfInstance]);


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

  const handleAddNode = (schema) => {
    setNodes((prevNodes) => {
      console.log("hua")
      const newNode = generateNode(schema, prevNodes); // use prev state
      console.log("haa")
      return [...prevNodes, newNode];
    });
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

  return (
    <>
      <Box 
        sx={{ 
          transition: 'margin-left 0.3s ease',
          position: 'absolute', 
          top:"0",
          width: `calc(100vw - ${drawerWidth}px)`,
          height: "100vh", 
          bgcolor: "background.default",
          left:drawerWidth
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
          <Toolbar sx={{ display: "flex", height:"10vh", justifyContent: "space-between" }}>
            <Typography variant="h6" color="text.primary">
              React Flow
            </Typography>
              <Button
                variant="contained"
                onClick={() => setDrawerOpen(true)}
              >
                + Add Node
              </Button>

          </Toolbar>
        </AppBar>

        <Box sx={{ height: "90vh", bgcolor: "white" , left:drawerWidth}}>

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
      {/* Right property drawer */}
      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
        setNodes={setNodes}

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