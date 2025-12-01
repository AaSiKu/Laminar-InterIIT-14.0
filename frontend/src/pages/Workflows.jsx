import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Box,
  Alert,
  Snackbar,
  IconButton,
  Typography,
} from "@mui/material";
import BackspaceIcon from "@mui/icons-material/Backspace";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { PropertyBar } from "../components/workflow/PropertyBar";
import { NodeDrawer } from "../components/workflow/NodeDrawer";
import { nodeTypes, generateNode } from "../utils/dashboard.utils";
import { useGlobalContext } from "../context/GlobalContext";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  spinupPipeline,
  spindownPipeline,
  saveDraftsAPI,
} from "../utils/pipelineUtils";
import { fetchNodeSchema } from "../utils/dashboard.api";
import TopBar from "../components/TopBar";
import PipelineNavBar from "../components/workflow/PipelineNavBar";
import BottomToolbar from "../components/workflow/BottomToolbar";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
//TODO: need to fix this logic for setting status to Broken/Running/Stopped
function toggleStatusLogic(variable) {
  return variable;
}

export default function WorkflowPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hoveredToolbarButton, setHoveredToolbarButton] = useState(null);
  const navigate = useNavigate();
  const { pipelineId } = useParams();
  
  // Deque-Based Undo/Redo System
  // Deque = array where:
  // - Left side (index 0) = oldest action (trash chute)
  // - Right side (end) = newest action (active door)
  const [undoDeque, setUndoDeque] = useState([]);
  const [redoDeque, setRedoDeque] = useState([]);
  const isApplyingAction = useRef(false);
  const currentPipelineIdRef = useRef(null);
  
  // Maximum undo history limit
  const MAX_UNDO_LIMIT = 10;
  
  // Track node positions for move detection
  const nodePositionsRef = useRef({});

  const {
    currentEdges,
    currentNodes,
    setCurrentNodes,
    setRfInstance,
    setCurrentEdges,
    currentPipelineStatus,
    setCurrentPipelineStatus,
    setAgentContainerId,
    currentPipelineId,
    rfInstance,
    setCurrentPipelineId,
    loading,
    setLoading,
    error,
    setError,
    setViewport,
    containerId,
    setContainerId,
    currentVersionId,
    setCurrentVersionId,
  } = useGlobalContext();

  useEffect(() => {
    if (currentPipelineId) {
      setLoading(true);

      saveDraftsAPI(
        currentVersionId,
        rfInstance,
        setCurrentVersionId,
        setLoading,
        setError
      )
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [
    currentPipelineId,
    currentVersionId,
    setCurrentEdges,
    setCurrentNodes,
    setViewport,
    setCurrentPipelineStatus,
    setLoading,
    setError,
    setContainerId,
  ]);

  // Clear deques when pipeline changes
  useEffect(() => {
    if (currentPipelineIdRef.current !== null && currentPipelineIdRef.current !== pipelineId) {
      console.log('Pipeline changed - clearing undo/redo deques');
      setUndoDeque([]);
      setRedoDeque([]);
      nodePositionsRef.current = {};
    }
    currentPipelineIdRef.current = pipelineId;
    
    return () => {
      console.log('Component unmounting - clearing deques');
      setUndoDeque([]);
      setRedoDeque([]);
      nodePositionsRef.current = {};
    };
  }, [pipelineId]);

  // Initialize node positions tracking
  useEffect(() => {
    const positions = {};
    currentNodes.forEach(node => {
      positions[node.id] = { x: node.position.x, y: node.position.y };
    });
    nodePositionsRef.current = positions;
  }, [currentNodes.length]); // Only on node count change

  // Add action to undo deque (push to right side)
  // When limit is exceeded, remove from left side (oldest action)
  const addAction = useCallback((action) => {
    if (isApplyingAction.current) return;
    
    setUndoDeque(prev => {
      // Push new action to the RIGHT side (end of array)
      const newDeque = [...prev, action];
      
      // If deque exceeds limit, remove from LEFT side (oldest action)
      if (newDeque.length > MAX_UNDO_LIMIT) {
        const removedAction = newDeque.shift(); // Remove oldest from left
        console.log(`Undo limit reached. Removing oldest action: ${removedAction.type}`);
      }
      
      console.log(`Action added to RIGHT: ${action.type} | Deque size: ${newDeque.length}/${MAX_UNDO_LIMIT}`);
      return newDeque;
    });
    
    // Clear redo deque when new action is performed (breaks redo timeline)
    setRedoDeque([]);
    
  }, []);

  // Execute an action (for redo)
  const executeAction = useCallback((action) => {
    isApplyingAction.current = true;
    
    switch (action.type) {
      case 'ADD_NODE':
        setCurrentNodes(prev => [...prev, action.node]);
        break;
        
      case 'REMOVE_NODE':
        setCurrentNodes(prev => prev.filter(n => n.id !== action.nodeId));
        setCurrentEdges(prev => prev.filter(e => 
          e.source !== action.nodeId && e.target !== action.nodeId
        ));
        break;
        
      case 'ADD_EDGE':
        setCurrentEdges(prev => [...prev, action.edge]);
        break;
        
      case 'REMOVE_EDGE':
        setCurrentEdges(prev => prev.filter(e => e.id !== action.edgeId));
        break;
        
      case 'MOVE_NODE':
        setCurrentNodes(prev => prev.map(n => 
          n.id === action.nodeId 
            ? { ...n, position: action.newPosition }
            : n
        ));
        nodePositionsRef.current[action.nodeId] = action.newPosition;
        break;
        
      case 'UPDATE_PROPERTIES':
        setCurrentNodes(prev => prev.map(n => 
          n.id === action.nodeId 
            ? { ...n, data: { ...n.data, properties: action.newProperties } }
            : n
        ));
        break;
        
      default:
        console.warn('Unknown action type:', action.type);
    }
    
    setTimeout(() => {
      isApplyingAction.current = false;
    }, 50);
  }, [setCurrentNodes, setCurrentEdges]);

  // Reverse an action (for undo)
  const reverseAction = useCallback((action) => {
    isApplyingAction.current = true;
    
    switch (action.type) {
      case 'ADD_NODE':
        // Reverse: Remove the node
        setCurrentNodes(prev => prev.filter(n => n.id !== action.node.id));
        // Also remove any edges connected to this node
        setCurrentEdges(prev => prev.filter(e => 
          e.source !== action.node.id && e.target !== action.node.id
        ));
        break;
        
      case 'REMOVE_NODE':
        // Reverse: Add the node back
        setCurrentNodes(prev => [...prev, action.node]);
        // Restore edges connected to this node
        if (action.connectedEdges && action.connectedEdges.length > 0) {
          setCurrentEdges(prev => [...prev, ...action.connectedEdges]);
        }
        break;
        
      case 'ADD_EDGE':
        // Reverse: Remove the edge
        setCurrentEdges(prev => prev.filter(e => e.id !== action.edge.id));
        break;
        
      case 'REMOVE_EDGE':
        // Reverse: Add the edge back
        setCurrentEdges(prev => [...prev, action.edge]);
        break;
        
      case 'MOVE_NODE':
        // Reverse: Move back to old position
        setCurrentNodes(prev => prev.map(n => 
          n.id === action.nodeId 
            ? { ...n, position: action.oldPosition }
            : n
        ));
        nodePositionsRef.current[action.nodeId] = action.oldPosition;
        break;
        
      case 'UPDATE_PROPERTIES':
        // Reverse: Restore old properties
        setCurrentNodes(prev => prev.map(n => 
          n.id === action.nodeId 
            ? { ...n, data: { ...n.data, properties: action.oldProperties } }
            : n
        ));
        break;
        
      default:
        console.warn('Unknown action type:', action.type);
    }
    
    setTimeout(() => {
      isApplyingAction.current = false;
    }, 50);
  }, [setCurrentNodes, setCurrentEdges]);

  const onNodesChange = useCallback(
    (changes) => {
      if (!isApplyingAction.current) {
        changes.forEach(change => {
          if (change.type === 'position' && change.dragging === false) {
            // Node move completed - record action
            const oldPosition = nodePositionsRef.current[change.id];
            const newPosition = change.position;
            
            // Only record if position actually changed
            if (oldPosition && (oldPosition.x !== newPosition.x || oldPosition.y !== newPosition.y)) {
              addAction({
                type: 'MOVE_NODE',
                nodeId: change.id,
                oldPosition: { ...oldPosition },
                newPosition: { ...newPosition }
              });
              
              // Update tracked position
              nodePositionsRef.current[change.id] = { ...newPosition };
            }
          } else if (change.type === 'remove') {
            // Node removal - find the node and its connected edges
            const nodeToRemove = currentNodes.find(n => n.id === change.id);
            const connectedEdges = currentEdges.filter(e => 
              e.source === change.id || e.target === change.id
            );
            
            if (nodeToRemove) {
              addAction({
                type: 'REMOVE_NODE',
                nodeId: change.id,
                node: JSON.parse(JSON.stringify(nodeToRemove)),
                connectedEdges: JSON.parse(JSON.stringify(connectedEdges))
              });
            }
          }
        });
      }
      
      setCurrentNodes((ns) => applyNodeChanges(changes, ns));
    },
    [setCurrentNodes, addAction, currentNodes, currentEdges]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      if (!isApplyingAction.current) {
        changes.forEach(change => {
          if (change.type === 'remove') {
            // Edge removal - find and store the edge
            const edgeToRemove = currentEdges.find(e => e.id === change.id);
            
            if (edgeToRemove) {
              addAction({
                type: 'REMOVE_EDGE',
                edgeId: change.id,
                edge: JSON.parse(JSON.stringify(edgeToRemove))
              });
            }
            
            // Clear selection if this edge was selected
            if (selectedEdge && change.id === selectedEdge.id) {
              setSelectedEdge(null);
            }
          }
        });
      }
      
      setCurrentEdges((es) => applyEdgeChanges(changes, es));
    },
    [setCurrentEdges, addAction, currentEdges, selectedEdge]
  );

  const onConnect = useCallback(
    (params) => {
      const newEdge = { ...params, id: `${params.source}-${params.target}-${Date.now()}`, animated: true };
      
      if (!isApplyingAction.current) {
        addAction({
          type: 'ADD_EDGE',
          edge: JSON.parse(JSON.stringify(newEdge))
        });
      }
      
      setCurrentEdges((es) => [...es, newEdge]);
    },
    [setCurrentEdges, addAction]
  );

  const handleAddNode = (schema) => {
    const newNode = generateNode(schema, currentNodes);
    
    if (!isApplyingAction.current) {
      addAction({
        type: 'ADD_NODE',
        node: JSON.parse(JSON.stringify(newNode))
      });
      
      // Track position
      nodePositionsRef.current[newNode.id] = { ...newNode.position };
    }
    
    setCurrentNodes((prev) => [...prev, newNode]);
  };

  // Undo/Redo handlers using Deque
  const handleUndo = useCallback(() => {
    if (undoDeque.length === 0) {
      console.log('Cannot undo: Undo deque is empty');
      return;
    }
    
    // Pop action from RIGHT side of undo deque (newest action)
    const action = undoDeque[undoDeque.length - 1];
    setUndoDeque(prev => prev.slice(0, -1));
    
    // Reverse the action
    reverseAction(action);
    
    // Push action to RIGHT side of redo deque
    setRedoDeque(prev => [...prev, action]);
    
    console.log(`UNDO: ${action.type} | Undo deque: ${undoDeque.length - 1} | Redo deque: ${redoDeque.length + 1}`);
  }, [undoDeque, redoDeque, reverseAction]);

  const handleRedo = useCallback(() => {
    if (redoDeque.length === 0) {
      console.log('Cannot redo: Redo deque is empty');
      return;
    }
    
    // Pop action from RIGHT side of redo deque (most recent undo)
    const action = redoDeque[redoDeque.length - 1];
    setRedoDeque(prev => prev.slice(0, -1));
    
    // Execute the action
    executeAction(action);
    
    // Push action to RIGHT side of undo deque
    setUndoDeque(prev => {
      const newDeque = [...prev, action];
      
      // Check if we exceed limit after redo
      if (newDeque.length > MAX_UNDO_LIMIT) {
        const removedAction = newDeque.shift(); // Remove oldest from left
        console.log(`Undo limit reached during redo. Removing oldest action: ${removedAction.type}`);
      }
      
      return newDeque;
    });
    
    console.log(`REDO: ${action.type} | Undo deque: ${undoDeque.length + 1} | Redo deque: ${redoDeque.length - 1}`);
  }, [undoDeque, redoDeque, executeAction]);

  const handleToggleStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const newStatus = await togglePipelineStatus(
        currentPipelineId,
        currentPipelineStatus
      );
      setCurrentPipelineStatus(
        // newStatus["status"] === "Stopped" ? "" : true
        toggleStatusLogic(newStatus["status"])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpinup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await spinupPipeline(currentPipelineId);
      setContainerId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      console.log(currentPipelineId);
      setLoading(false);
    }
  };

  const handleSpindown = async () => {
    setLoading(true);
    setError(null);
    try {
      await spindownPipeline(currentPipelineId);
      setContainerId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const onEdgeClick = (event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleEnterFullscreen = () => {
    setIsFullscreen(true);
    setSelectedNode(null);
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleLockToggle = () => {
    setIsLocked(prev => !prev);
  };

  const handleUpdateProperties = (nodeId, data) => {
    if (!isApplyingAction.current) {
      // Find current properties before update
      const node = currentNodes.find(n => n.id === nodeId);
      if (node) {
        addAction({
          type: 'UPDATE_PROPERTIES',
          nodeId,
          oldProperties: JSON.parse(JSON.stringify(node.data?.properties || {})),
          newProperties: JSON.parse(JSON.stringify(data))
        });
      }
    }
    
    setCurrentNodes((nds) =>
      nds.map((n, idx) =>
        n.id === nodeId ? { ...n, data: { ...n.data, properties: data } } : n
      )
    );
    setSelectedNode(null);
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();

      const nodeName = event.dataTransfer.getData("application/reactflow");

      if (!nodeName || !rfInstance) {
        return;
      }

      try {
        // Get the position where the node was dropped
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Fetch the schema for the node
        const schema = await fetchNodeSchema(nodeName);

        // Generate the node with the drop position
        const newNode = generateNode(schema, currentNodes);
        newNode.position = position;

        if (!isApplyingAction.current) {
          addAction({
            type: 'ADD_NODE',
            node: JSON.parse(JSON.stringify(newNode))
          });
          
          // Track position
          nodePositionsRef.current[newNode.id] = { ...newNode.position };
        }

        // Add the node to the canvas
        setCurrentNodes((prev) => [...prev, newNode]);
      } catch (err) {
        console.error("Failed to add node:", err);
        setError("Failed to add node. Please try again.");
      }
    },
    [rfInstance, currentNodes, setCurrentNodes, setError, addAction]
  );

  const drawerWidth = 64;

  const handleShareClick = (event) => {
    setShareAnchorEl(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareAnchorEl(null);
  };

  const handleBackClick = () => {
    navigate("/workflows");
  };

  // Keyboard shortcuts for undo/redo/add
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Press A to toggle add node drawer (only if not in an input field, not locked, and no other sidebar open)
      if ((e.key === 'a' || e.key === 'A') && !isLocked && !isFullscreen && !e.ctrlKey && !e.metaKey) {
        // Check if focus is not on an input element
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
          return;
        }
        // Don't toggle if property bar is open
        if (selectedNode) {
          return;
        }
        e.preventDefault();
        // Toggle the drawer
        setDrawerOpen(prev => !prev);
      }
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isLocked, isFullscreen, drawerOpen, selectedNode]);

  // Backspace to delete selected edge
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace' && selectedEdge && !isFullscreen && !isLocked) {
        e.preventDefault();
        
        // Find the edge to delete
        const edgeToRemove = currentEdges.find(edge => edge.id === selectedEdge.id);
        
        if (edgeToRemove && !isApplyingAction.current) {
          addAction({
            type: 'REMOVE_EDGE',
            edgeId: selectedEdge.id,
            edge: JSON.parse(JSON.stringify(edgeToRemove))
          });
        }
        
        setCurrentEdges((edges) => edges.filter((edge) => edge.id !== selectedEdge.id));
        setSelectedEdge(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdge, isFullscreen, isLocked, setCurrentEdges, addAction, currentEdges]);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleExitFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Create styled edges with selection highlighting
  const styledEdges = currentEdges.map((edge) => ({
    ...edge,
    selected: selectedEdge?.id === edge.id,
    style: selectedEdge?.id === edge.id ? {
      stroke: '#2196F3',
      strokeWidth: 2.5,
      filter: 'drop-shadow(0 0 2px rgba(33, 150, 243, 0.4))',
    } : {
      ...edge.style,
      stroke: edge.style?.stroke || '#b1b1b7',
      strokeWidth: edge.style?.strokeWidth || 2,
    },
    animated: selectedEdge?.id === edge.id ? true : edge.animated,
  }));

  // Fullscreen view
  if (isFullscreen) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          bgcolor: "#ffffff",
          zIndex: 9999,
        }}
      >
        <WorkflowCanvas
          nodes={currentNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={() => {}}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onInit={setRfInstance}
          onPaneClick={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
          onFullscreenClick={handleExitFullscreen}
        />

        {/* Exit Fullscreen Button */}
        <Box
          sx={{
            position: "fixed",
            bottom: 12,
            right: 12,
            display: "flex",
            gap: 0.5,
            bgcolor: "#C3D3DB",
            borderRadius: "8px",
            padding: "4px 8px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
            zIndex: 10000,
          }}
        >
          <IconButton
            onClick={handleExitFullscreen}
            sx={{
              bgcolor: "#F7FAFC",
              color: "#1f2937",
              "&:hover": { bgcolor: "#e5e7eb" },
              width: 30,
              height: 30,
              borderRadius: "6px",
            }}
          >
            <FullscreenExitIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    );
  }

  // Normal view
  return (
    <>
      <Box
        sx={{
          transition: "margin-left 0.3s ease",
          left: drawerWidth,
          position: "absolute",
          width: `calc(100vw - ${drawerWidth}px)`,
          height: "100vh",
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        {/* <TopBar/> */}

        <PipelineNavBar
          onBackClick={handleBackClick}
          pipelineName={`Pipeline ${pipelineId ? pipelineId.toLowerCase() : 'a'}`}
          loading={loading}
          shareAnchorEl={shareAnchorEl}
          onShareClick={handleShareClick}
          onShareClose={handleShareClose}
          onSave={() =>
            savePipelineAPI( 
              rfInstance,
              currentPipelineId,
              setCurrentPipelineId,
              currentVersionId,
              setCurrentVersionId,
              setError,
              setLoading
            )
          }
          onSpinup={handleSpinup}
          onSpindown={handleSpindown}
          onToggleStatus={handleToggleStatus}
          currentPipelineStatus={currentPipelineStatus}
          currentPipelineId={currentPipelineId}
          containerId={containerId}
        />

        <Box
          sx={{
            height: "calc(100vh - 48px)",
            width: "100%",
            bgcolor: "background.paper",
            position: "relative",
            padding: 0,
            display: "flex",
            alignItems: "stretch",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <WorkflowCanvas
            nodes={currentNodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPaneClick={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
            onCanvasClick={(e) => {
              if (
                e.target.classList.contains("react-flow__pane") ||
                e.target.classList.contains("react-flow__renderer")
              ) {
                setSelectedNode(null);
                setSelectedEdge(null);
              }
            }}
            onFullscreenClick={handleEnterFullscreen}
            isLocked={isLocked}
            onLockToggle={handleLockToggle}
          />

          {/* Lock Message Helper */}
          {isLocked && !hoveredToolbarButton && (
            <Box
              sx={{
                position: "absolute",
                bottom: 56,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.3,
                zIndex: 1000,
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: "0.6rem",
                  color: "#000000",
                  textShadow: "1px 1px 2px rgba(255, 255, 255, 0.9), -1px -1px 2px rgba(255, 255, 255, 0.9), 0 0 3px rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.2,
                  fontWeight: 500,
                }}
              >
                Click <LockOpenIcon sx={{ fontSize: 11 }} /> to unlock and make changes
              </Typography>
            </Box>
          )}

          {/* Toolbar Button Helper */}
          {hoveredToolbarButton && (
            <Box
              sx={{
                position: "absolute",
                bottom: 56,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.3,
                zIndex: 1000,
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: "0.6rem",
                  color: "#000000",
                  textShadow: "1px 1px 2px rgba(255, 255, 255, 0.9), -1px -1px 2px rgba(255, 255, 255, 0.9), 0 0 3px rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.2,
                  fontWeight: 500,
                }}
              >
                {hoveredToolbarButton === 'add' && 'Add Node (Press A)'}
                {hoveredToolbarButton === 'undo' && 'Undo (Ctrl + Z)'}
                {hoveredToolbarButton === 'redo' && 'Redo (Ctrl + Shift + Z)'}
              </Typography>
            </Box>
          )}

          {/* Delete Edge Helper */}
          {selectedEdge && !isLocked && !hoveredToolbarButton && (
            <Box
              sx={{
                position: "absolute",
                bottom: 56,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.3,
                zIndex: 1000,
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: "0.6rem",
                  color: "#000000",
                  textShadow: "1px 1px 2px rgba(255, 255, 255, 0.9), -1px -1px 2px rgba(255, 255, 255, 0.9), 0 0 3px rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.2,
                  fontWeight: 500,
                }}
              >
                Click <BackspaceIcon sx={{ fontSize: 11 }} /> to delete connection
              </Typography>
            </Box>
          )}

          <BottomToolbar
            onAddClick={() => !isLocked && setDrawerOpen(true)}
            onUndoClick={handleUndo}
            onRedoClick={handleRedo}
            onHoverChange={setHoveredToolbarButton}
            addDisabled={isLocked}
            undoDisabled={isLocked || undoDeque.length === 0}
            redoDisabled={isLocked || redoDeque.length === 0}
          />
        </Box>
      </Box>

      <NodeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAddNode={handleAddNode}
        setNodes={setCurrentNodes}
        currentNodes={currentNodes}
        undoDeque={undoDeque}
      />
      <PropertyBar
        open={Boolean(selectedNode)}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateProperties={handleUpdateProperties}
        readOnly={isLocked}
      />
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
