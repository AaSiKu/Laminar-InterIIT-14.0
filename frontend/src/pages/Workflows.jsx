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
import NearMeIcon from "@mui/icons-material/NearMe";
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
import ZoomControl from "../components/workflow/ZoomControl";
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [hoveredToolbarButton, setHoveredToolbarButton] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
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
    user,
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

  // Handler for edit button click - toggles property bar
  const handleNodeEditClick = useCallback((nodeId) => {
    const node = currentNodes.find(n => n.id === nodeId);
    if (node) {
      // If the same node is already selected, close the property bar
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
      } else {
        // Open property bar for the clicked node
        setSelectedNode(node);
        setSelectedEdge(null);
      }
    }
  }, [currentNodes, selectedNode]);

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

  const handleFitScreen = useCallback(() => {
    if (!rfInstance) {
      console.warn('ReactFlow instance not available');
      return;
    }

    try {
      // ReactFlow v12+ uses fitView method directly on the instance
      if (typeof rfInstance.fitView === 'function') {
        rfInstance.fitView({ 
          padding: 0.1, 
          maxZoom: 0.9,
          duration: 300,
          includeHiddenNodes: false
        });
      } else if (rfInstance.getNodes && rfInstance.getViewport && rfInstance.setViewport) {
        // Fallback implementation using getNodes
        const nodes = rfInstance.getNodes();
        if (!nodes || nodes.length === 0) {
          console.warn('No nodes to fit');
          return;
        }
        
        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        nodes.forEach(node => {
          const nodeWidth = node.measured?.width || node.width || 200;
          const nodeHeight = node.measured?.height || node.height || 100;
          
          minX = Math.min(minX, node.position.x);
          maxX = Math.max(maxX, node.position.x + nodeWidth);
          minY = Math.min(minY, node.position.y);
          maxY = Math.max(maxY, node.position.y + nodeHeight);
        });
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        if (width > 0 && height > 0) {
          // Get container dimensions from viewport or use defaults
          const viewport = rfInstance.getViewport();
          const containerWidth = viewport.width || window.innerWidth;
          const containerHeight = viewport.height || window.innerHeight;
          
          // Calculate scale to fit with padding
          const padding = 40;
          const scale = Math.min(
            (containerWidth - padding * 2) / width,
            (containerHeight - padding * 2) / height,
            0.9
          );
          
          // Calculate center position
          const x = (containerWidth - width * scale) / 2 - minX * scale;
          const y = (containerHeight - height * scale) / 2 - minY * scale;
          
          rfInstance.setViewport({ x, y, zoom: scale }, { duration: 300 });
        }
      } else {
        console.error('ReactFlow instance does not have required methods');
      }
    } catch (error) {
      console.error('Error fitting view:', error);
    }
  }, [rfInstance]);

  const handleLockToggle = () => {
    setIsLocked(prev => !prev);
  };

  const handleSelectionModeToggle = () => {
    setIsSelectionMode(prev => !prev);
  };

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    if (rfInstance) {
      const currentZoom = rfInstance.getZoom();
      const roundedZoom = Math.round((currentZoom * 100) / 10) * 10;
      const newZoom = Math.min((roundedZoom + 10) / 100, 2); // Max 200%, increment by 10%
      rfInstance.zoomTo(newZoom);
      setZoomLevel(newZoom * 100);
    }
  }, [rfInstance]);

  const handleZoomOut = useCallback(() => {
    if (rfInstance) {
      const currentZoom = rfInstance.getZoom();
      const roundedZoom = Math.round((currentZoom * 100) / 10) * 10;
      const newZoom = Math.max((roundedZoom - 10) / 100, 0.1); // Min 10%, decrement by 10%
      rfInstance.zoomTo(newZoom);
      setZoomLevel(newZoom * 100);
    }
  }, [rfInstance]);

  const handleZoomChange = useCallback((zoomPercent) => {
    if (rfInstance) {
      const newZoom = zoomPercent / 100;
      rfInstance.zoomTo(newZoom);
      setZoomLevel(zoomPercent);
    }
  }, [rfInstance]);

  // Update zoom level when viewport changes
  useEffect(() => {
    if (rfInstance) {
      const updateZoom = () => {
        const zoom = rfInstance.getZoom();
        setZoomLevel(zoom * 100);
      };
      
      // Update zoom on viewport change
      const unsubscribe = rfInstance.onViewportChange?.(updateZoom);
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [rfInstance]);

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

  const handleExportJSON = () => {
    if (!rfInstance) {
      setError("No workflow data available to export");
      return;
    }

    try {
      // Get the complete workflow data from ReactFlow instance
      const flowData = rfInstance.toObject();
      
      // Create a comprehensive export object
      const exportData = {
        ...flowData,
        metadata: {
          pipelineName: `Pipeline ${pipelineId ? pipelineId.toLowerCase() : 'a'}`,
          pipelineId: currentPipelineId,
          versionId: currentVersionId,
          exportedAt: new Date().toISOString(),
          exportedBy: user?.name || user?.id || 'Unknown',
        },
      };

      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create a blob with the JSON data
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `pipeline-${pipelineId || 'workflow'}-${new Date().toISOString().split('T')[0]}.json`;
      link.download = fileName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export workflow. Please try again.');
    }
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

  // F for fullscreen, Shift+F for fit screen, F again to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if focus is not on an input element
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        return;
      }

      // Shift + F: Fit screen (check shift first)
      if ((e.key === 'f' || e.key === 'F') && e.shiftKey) {
        e.preventDefault();
          handleFitScreen();
        return;
      }

      // F: Fullscreen toggle
      if ((e.key === 'f' || e.key === 'F') && !e.shiftKey) {
        e.preventDefault();
        if (isFullscreen) {
          // F when in fullscreen: Exit fullscreen
          handleExitFullscreen();
        } else {
          // F: Enter fullscreen
          handleEnterFullscreen();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleFitScreen]);

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

  // Add onEditClick handler to all nodes
  const nodesWithEditHandler = currentNodes.map((node) => ({
    ...node,
    onEditClick: handleNodeEditClick,
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
          nodes={nodesWithEditHandler}
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
          onFullscreenClick={handleEnterFullscreen}
          onFitScreenClick={handleFitScreen}
          onRunBook={() => {
            // TODO: Implement Run Book functionality
            console.log("Run Book clicked");
          }}
          onExportJSON={handleExportJSON}
          pipelineId={pipelineId}
          userAvatar="https://i.pravatar.cc/40"
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
            nodes={nodesWithEditHandler}
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
                bottom: 68,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.3,
                zIndex: 1001,
                pointerEvents: "none",
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
                Click <NearMeIcon sx={{ fontSize: 11, transform: 'scaleX(-1)' }} /> to unlock and make changes
              </Typography>
            </Box>
          )}

          {/* Delete Edge Helper */}
          {selectedEdge && !isLocked && !hoveredToolbarButton && (
            <Box
              sx={{
                position: "absolute",
                bottom: 68,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 0.3,
                zIndex: 1001,
                pointerEvents: "none",
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
            isLocked={isLocked}
            onLockToggle={handleLockToggle}
          />

          <ZoomControl
            zoom={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomChange={handleZoomChange}
            propertyBarOpen={Boolean(selectedNode)}
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
