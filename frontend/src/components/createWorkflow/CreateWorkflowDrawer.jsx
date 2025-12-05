import { useState, useEffect, useCallback, useRef } from "react";
import {
  Typography,
  Button,
  IconButton,
  Slide,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import Playground from "../workflow/Playground";
import { fetchAllUsers, createPipelineWithDetails } from "../../utils/developerDashboard.api";
import StepSidebar, { STEP_SIDEBAR_COLLAPSED_WIDTH } from "./StepSidebar";
import BasicInformationForm from "./BasicInformationForm";
import ContractParserWebSocket from "../../utils/contractParserWebSocket";
import NodeApprovalPopup from "./NodeApprovalPopup";

// Stepper steps configuration
const steps = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "AI Assistant" },
  { id: 3, label: "Nodes Setup" },
  { id: 4, label: "Done" },
];

const CreateWorkflowDrawer = ({ open, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: "",
    document: null,
    selectedMembers: [],
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Pipeline nodes and edges state (managed here, passed to Playground)
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // AI chatbot state
  const [isGenerating, setIsGenerating] = useState(false);

  // WebSocket and contract parser state
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [proposedNode, setProposedNode] = useState(null);
  const [proposedNodePosition, setProposedNodePosition] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isRenderingNode, setIsRenderingNode] = useState(false);
  const finalFlowchartRef = useRef(null);
  const rfInstanceRef = useRef(null);

  // TODO: not to do so Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({ name: "", description: "", members: "",  document: null, selectedMembers: [] });
      setNodes([]);
      setEdges([]);
      setIsGenerating(false);
      setChatMessages([]);
      setProposedNode(null);
      setProposedNodePosition(null);
      setAwaitingInput(false);
      setWsConnected(false);
      finalFlowchartRef.current = null;
    } else {
      // Disconnect WebSocket when drawer closes
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      // Reset users list when drawer closes to fetch fresh data next time
      setAllUsers([])
      setLoadingUsers(false);
    }
  }, [open]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Connect to WebSocket when moving to step 2 with description
  useEffect(() => {
    if (currentStep === 2 && formData.description && !wsRef.current && open) {
          const connectWebSocket = async () => {
        try {
          setIsGenerating(true);
          console.log("Connecting to contract parser agent WebSocket...");
          const ws = new ContractParserWebSocket({
            onOpen: () => {
              setWsConnected(true);
              console.log("WebSocket connected");
            },
            onMessage: (data) => {
              handleWebSocketMessage(data);
            },
            onError: (error) => {
              console.error("WebSocket error:", error);
              setSnackbar({
                open: true,
                message: "Failed to connect to AI agent",
                severity: "error",
              });
              setIsGenerating(false);
            },
            onClose: () => {
              setWsConnected(false);
              setIsGenerating(false);
            },
            onNodeProposed: (data) => {
              handleNodeProposed(data);
            },
            onFlowchartUpdate: (data) => {
              // Handle flowchart updates (when flowchart.json is updated)
              if (data.flowchart) {
                updateNodesFromFlowchart(data.flowchart);
              }
            },
            onFinal: async (data) => {
              // Store final flowchart - don't save yet, wait for Create button
              console.log("Final flowchart received:", data);
              if (data.flowchart) {
                finalFlowchartRef.current = data.flowchart;
                // Update nodes/edges from final flowchart (process them first)
                await updateNodesFromFlowchart(data.flowchart);
                // Don't save to MongoDB here - will save when Create button is clicked
                setChatMessages((prev) => [
                  ...prev,
                  { role: "system", content: "Workflow generation complete! Click 'Next' to review and then 'Create' to save." },
                ]);
              }
            },
          });

          // Determine what to send: PDF (with optional description) or description only
          let initialData = null;
          
          if (formData.document && formData.document.type === 'application/pdf') {
            // Upload PDF first, then send path with description as additional context
            console.log("Uploading PDF file:", formData.document.name);
            try {
              const formDataUpload = new FormData();
              formDataUpload.append('file', formData.document);
              
              const uploadResponse = await fetch(
                `http://localhost:${import.meta.env.VITE_CONTRACT_PARSER_PORT || '8001'}/upload-pdf`,
                {
                  method: 'POST',
                  body: formDataUpload,
                }
              );
              
              if (!uploadResponse.ok) {
                throw new Error(`Failed to upload PDF: ${uploadResponse.statusText}`);
              }
              
              const uploadResult = await uploadResponse.json();
              console.log("PDF uploaded successfully:", uploadResult);
              
              // Send PDF path to WebSocket, with description as additional context if provided
              initialData = {
                pdf_path: uploadResult.pdf_path,
              };
              
              // Include description as additional context if provided
              if (formData.description && formData.description.trim()) {
                initialData.description = formData.description;
                console.log("Including description as additional context with PDF");
              }
            } catch (error) {
              console.error("Error uploading PDF:", error);
              setSnackbar({
                open: true,
                message: `Failed to upload PDF: ${error.message}`,
                severity: "error",
              });
              setIsGenerating(false);
              return;
            }
          } else if (formData.description) {
            // Format description into metrics (option 2)
            const metrics = ContractParserWebSocket.formatDescriptionToMetrics(formData.description);
            initialData = { metrics };
          } else {
            // No PDF or description - use default
            initialData = { 
              metrics: ContractParserWebSocket.formatDescriptionToMetrics("Workflow description") 
            };
          }
          
          // Connect and send initial data
          await ws.connect(initialData);
          wsRef.current = ws;
        } catch (error) {
          console.error("Error connecting WebSocket:", error);
          setSnackbar({
            open: true,
            message: "Failed to connect to AI agent",
            severity: "error",
          });
          setIsGenerating(false);
        }
      };

      connectWebSocket();
    }

    return () => {
      // Cleanup on unmount or step change
      if (currentStep !== 2 && wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
        setWsConnected(false);
      }
    };
  }, [currentStep, formData.description, open]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    const msgType = data.type;

    switch (msgType) {
      case "session_start":
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: data.message || "Session started" },
        ]);
        break;

      case "phase":
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: `\n${data.message}\n` },
        ]);
        break;

      case "agent_response":
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
        // After agent response, we might be waiting for input
        // Don't set isGenerating to false here, let await_input handle it
        break;

      case "await_input":
        console.log("Server is waiting for user input");
        setAwaitingInput(true);
        setIsGenerating(false); // Stop showing "Generating..." and enable input
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: "Waiting for your response..." },
        ]);
        break;

      case "phase1_complete":
        console.log("Phase 1 complete, flowchart received:", data.flowchart);
        if (data.flowchart) {
          updateNodesFromFlowchart(data.flowchart);
        }
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: "Phase 1 Complete!" },
        ]);
        setIsGenerating(false);
        break;

      case "node_approved":
        // Node was approved - just remove the "proposed-" prefix and clear dialog
        // Node is already rendered, just need to make it permanent
        console.log("Node approved:", data);
        setIsRenderingNode(false); // Unfreeze buttons - node rendering complete
        if (proposedNode) {
          // Remove "proposed-" prefix from node ID
          const approvedNodeId = proposedNode.id.replace("proposed-", "");
          
          setNodes((prev) => {
            // Map through nodes and update the approved one, keep all others unchanged
            return prev.map(n => {
              if (n.id === proposedNode.id) {
                // This is the node being approved - remove proposed- prefix
                // Ensure position is valid
                let position = n.position;
                if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                  position = { x: 0, y: 0 };
                }
                
                return {
                  ...n,
                  id: approvedNodeId,
                  position: position, // Ensure position is always valid
                  data: {
                    ...n.data,
                    isProposed: false,
                  },
                };
              }
              // Keep all other nodes exactly as they are (including previously approved ones)
              // But ensure they also have valid positions
              if (!n.position || typeof n.position.x !== 'number' || typeof n.position.y !== 'number') {
                return {
                  ...n,
                  position: { x: 0, y: 0 },
                };
              }
              return n;
            });
          });
          
          // Update edges to remove "proposed-" prefix from the approved node
          setEdges((prev) => {
            return prev.map(edge => {
              // Update source if it's the approved node
              let source = edge.source;
              if (source === proposedNode.id) {
                source = approvedNodeId;
              } else if (source?.startsWith("proposed-") && source.replace("proposed-", "") === approvedNodeId) {
                source = approvedNodeId;
              }
              
              // Update target if it's the approved node
              let target = edge.target;
              if (target === proposedNode.id) {
                target = approvedNodeId;
              } else if (target?.startsWith("proposed-") && target.replace("proposed-", "") === approvedNodeId) {
                target = approvedNodeId;
              }
              
              return {
                ...edge,
                source: source,
                target: target,
              };
            });
          });
        }
        setProposedNode(null);
        setProposedNodePosition(null);
        setIsGenerating(false);
        break;

      case "phase2_complete":
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: data.message || "Phase 2 Complete!" },
        ]);
        break;

      case "done":
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: `Session ended: ${data.reason || "complete"}` },
        ]);
        setIsGenerating(false);
        break;

      case "error":
        setChatMessages((prev) => [
          ...prev,
          { role: "error", content: `Error: ${data.message}` },
        ]);
        setIsGenerating(false);
        break;

      case "status":
        setChatMessages((prev) => [
          ...prev,
          { role: "system", content: data.message },
        ]);
        break;
    }
  }, []);

  // Handle node proposed - render immediately with proper processing
  const handleNodeProposed = useCallback(async (data) => {
    const node = data.node;
    
    // Ensure position exists and is valid
    let nodePosition = node.position;
    if (!nodePosition || typeof nodePosition.x !== 'number' || typeof nodePosition.y !== 'number') {
      nodePosition = { x: 0, y: 0 };
    }
    
    // Process the node immediately to ensure it renders properly
    try {
      const { add_to_node_types } = await import("../../utils/pipelineUtils");
      await add_to_node_types([node]);
      
      // Ensure type is set
      if (!node.type && node.node_id) {
        node.type = node.node_id;
      } else if (!node.type) {
        node.type = 'default';
      }
      
      // Ensure data structure is correct
      if (!node.data) {
        node.data = {};
      }
      if (!node.data.properties) {
        node.data.properties = node.properties || {};
      }
    } catch (error) {
      console.error("Error processing proposed node:", error);
    }
    
    // Add proposed node to canvas - render it immediately with proper structure
    const tempNode = {
      ...node,
      id: `proposed-${node.id}`,
      position: nodePosition, // Ensure position is always set
      data: {
        ...node.data,
        isProposed: true,
      },
    };
    
    setProposedNode(tempNode);
    setProposedNodePosition(nodePosition);
    
    // Add to nodes immediately for visualization (already processed)
    // Only remove the previous proposed node, keep all approved nodes
    setNodes((prev) => {
      // Get the ID of the previous proposed node (if any)
      const previousProposedId = proposedNode?.id;
      
      // Remove only the previous proposed node (if any), keep all other nodes
      const filtered = prev.filter((n) => {
        // Keep all nodes that don't start with "proposed-" (these are approved nodes)
        if (!n.id.startsWith("proposed-")) {
          return true;
        }
        // Remove only the previous proposed node (if it exists and is different from new one)
        if (previousProposedId && n.id === previousProposedId) {
          return false; // Remove the old proposed node
        }
        // Keep the new proposed node if it's already in the list
        if (n.id === tempNode.id) {
          return true;
        }
        // Remove any other proposed nodes (shouldn't happen, but just in case)
        return false;
      });
      
      // Check if the new proposed node is already in the list
      const nodeExists = filtered.some(n => n.id === tempNode.id);
      
      // Ensure all nodes in filtered have valid positions
      const validatedFiltered = filtered.map(n => {
        if (!n.position || typeof n.position.x !== 'number' || typeof n.position.y !== 'number') {
          return {
            ...n,
            position: { x: 0, y: 0 },
          };
        }
        return n;
      });
      
      // Add the new proposed node if it doesn't exist
      return nodeExists ? validatedFiltered : [...validatedFiltered, tempNode];
    });
    
    // Also add edges immediately if provided
    if (data.edges && data.edges.length > 0) {
      setEdges((prev) => {
        // Get the ID of the previous proposed node (if any)
        const previousProposedId = proposedNode?.id;
        
        const newEdges = data.edges.map(edge => {
          // Convert source/target to use proposed- prefix for the new proposed node
          let source = edge.source;
          let target = edge.target;
          
          // If source is the new node, add proposed- prefix
          if (source === node.id) {
            source = `proposed-${node.id}`;
          }
          // If target is the new node, add proposed- prefix
          if (target === node.id) {
            target = `proposed-${node.id}`;
          }
          
          return {
            ...edge,
            source: source,
            target: target,
          };
        });
        
        // Remove only edges that connect to the previous proposed node
        // Keep all other edges (including those connecting approved nodes)
        const filtered = prev.filter(e => {
          // Keep edges that don't involve any proposed nodes (these are between approved nodes)
          if (!e.source?.startsWith("proposed-") && !e.target?.startsWith("proposed-")) {
            return true;
          }
          // Remove edges that connect to the previous proposed node
          // But keep edges that might connect approved nodes to other approved nodes
          if (previousProposedId) {
            return !(e.source === previousProposedId || e.target === previousProposedId);
          }
          // If no previous proposed node, remove all proposed edges (they'll be replaced)
          return false;
        });
        
        return [...filtered, ...newEdges];
      });
    }
    
    // Fit viewport to show the new node in the right half of the screen
    setTimeout(() => {
      if (rfInstanceRef.current) {
        try {
          const rfInstance = rfInstanceRef.current;
          
          // Get the node dimensions (default if not available)
          const nodeWidth = tempNode.measured?.width || 200;
          const nodeHeight = tempNode.measured?.height || 100;
          
          // Get ReactFlow container element to get actual dimensions
          const reactFlowElement = rfInstance.getViewport();
          const reactFlowContainer = document.querySelector('.react-flow');
          const containerRect = reactFlowContainer?.getBoundingClientRect();
          
          // Get actual container dimensions
          const containerWidth = containerRect?.width || (window.innerWidth - 600);
          const containerHeight = containerRect?.height || window.innerHeight;
          
          // Target position: right side of the visible canvas (75% from left)
          const targetScreenX = containerWidth * 0.75;
          const targetScreenY = containerHeight * 0.5;
          
          // Use a reasonable zoom level
          const currentZoom = rfInstance.getZoom();
          const targetZoom = Math.min(currentZoom, 1.0);
          
          // Calculate viewport position to center the node at target screen position
          // Formula: screenX = (flowX * zoom) + viewportX
          // Solving for viewportX: viewportX = screenX - (flowX * zoom)
          // We want the node center at targetScreenX, so:
          const nodeCenterX = nodePosition.x + (nodeWidth / 2);
          const nodeCenterY = nodePosition.y + (nodeHeight / 2);
          
          const viewportX = targetScreenX - (nodeCenterX * targetZoom);
          const viewportY = targetScreenY - (nodeCenterY * targetZoom);
          
          // Set the viewport to show the node in the right half
          rfInstance.setViewport(
            { x: viewportX, y: viewportY, zoom: targetZoom },
            { duration: 500 }
          );
          
          console.log("Fitted viewport to proposed node:", {
            nodePosition,
            nodeCenter: { x: nodeCenterX, y: nodeCenterY },
            nodeSize: { width: nodeWidth, height: nodeHeight },
            viewport: { x: viewportX, y: viewportY, zoom: targetZoom },
            targetScreen: { x: targetScreenX, y: targetScreenY },
            container: { width: containerWidth, height: containerHeight },
          });
        } catch (error) {
          console.error("Error fitting viewport to proposed node:", error);
          // Fallback: use fitView to show all nodes
          try {
            rfInstanceRef.current.fitView({ padding: 0.2, duration: 500 });
          } catch (fallbackError) {
            console.error("Fallback fitView also failed:", fallbackError);
          }
        }
      }
    }, 300); // Small delay to ensure node is rendered
  }, []);

  // Update nodes from flowchart
  const updateNodesFromFlowchart = useCallback(async (flowchart) => {
    if (flowchart.nodes && flowchart.edges) {
      console.log("Updating nodes from flowchart:", {
        nodeCount: flowchart.nodes.length,
        edgeCount: flowchart.edges.length,
      });
      
      // Remove proposed nodes
      const cleanNodes = flowchart.nodes.filter((n) => !n.id.startsWith("proposed-"));
      
      // Process nodes to ensure they have proper types and structure
      try {
        const { add_to_node_types } = await import("../../utils/pipelineUtils");
        if (cleanNodes.length > 0) {
          await add_to_node_types(cleanNodes);
        }
        
        // Validate and ensure nodes have required properties
        const validatedNodes = cleanNodes.map((node, index) => {
          // Ensure node has required properties
          if (!node.id) {
            console.warn("Node missing id:", node);
            node.id = `node-${index}`;
          }
          
          // Ensure position exists
          if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
            console.warn("Node missing or invalid position:", node);
            node.position = node.position || { x: index * 250, y: index * 150 };
          }
          
          // Ensure type exists - use node_id if type is missing
          if (!node.type && node.node_id) {
            node.type = node.node_id;
          } else if (!node.type) {
            console.warn("Node missing both type and node_id:", node);
            node.type = 'default';
          }
          
          // Ensure data exists
          if (!node.data) {
            node.data = {};
          }
          
          return node;
        });
        
        console.log("Validated nodes:", validatedNodes);
        setNodes(validatedNodes);
        setEdges(flowchart.edges || []);
      } catch (error) {
        console.error("Error processing nodes:", error);
        // Fallback: set nodes without processing
        setNodes(cleanNodes);
        setEdges(flowchart.edges || []);
      }
    }
  }, []);

  // Handle node approval
  // Handle node approval - just remove dialog and continue (node already rendered)
  const handleNodeApproval = useCallback((action) => {
    if (!wsRef.current) return;

    if (action === "approve") {
      // Node is already rendered, just send approval and freeze buttons
      wsRef.current.sendApproval("approve");
      setIsRenderingNode(true); // Freeze buttons and show "Rendering node..."
      setIsGenerating(false);
    } else if (action === "reject") {
      // Feedback will be sent via handleNodeRejection
    }
  }, []);

  // Handle node rejection - send feedback, remove node, server will regenerate
  const handleNodeRejection = useCallback((feedback) => {
    if (!wsRef.current) return;
    setIsRenderingNode(false); // Unfreeze buttons when rejecting
    // Send feedback and remove proposed node (server will regenerate)
    wsRef.current.sendApproval("reject", feedback);
    // Remove proposed node from canvas (server will send new one)
    setNodes((prev) => prev.filter((n) => !n.id.startsWith("proposed-")));
    setEdges((prev) => prev.filter(e => 
      !(e.source && e.source.startsWith("proposed-")) && 
      !(e.target && e.target.startsWith("proposed-"))
    ));
    setProposedNode(null);
    setProposedNodePosition(null);
    setIsGenerating(true); // Show generating while waiting for regenerated node
  }, []);

  // Save final flowchart to MongoDB
  const saveFinalFlowchart = useCallback(async (flowchart) => {
    try {
      console.log("Saving final flowchart to MongoDB:", {
        nodeCount: flowchart.nodes?.length || 0,
        edgeCount: flowchart.edges?.length || 0,
        name: formData.name,
        description: formData.description,
      });
      
      const viewerIds = formData.selectedMembers.map((user) => String(user.id));
      
      // Process nodes before saving to ensure they're valid
      const processedNodes = flowchart.nodes || [];
      if (processedNodes.length > 0) {
        try {
          const { add_to_node_types } = await import("../../utils/pipelineUtils");
          await add_to_node_types(processedNodes);
        } catch (error) {
          console.warn("Error processing nodes before save:", error);
        }
      }
      
      const pipeline = {
        nodes: processedNodes,
        edges: flowchart.edges || [],
        viewport: flowchart.viewport || { x: 0, y: 0, zoom: 1 },
      };

      console.log("Calling createPipelineWithDetails API...");
      const result = await createPipelineWithDetails(
        formData.name,
        formData.description,
        viewerIds,
        pipeline
      );

      console.log("Pipeline created successfully:", result);
      
      // Extract pipeline and version IDs from response
      const pipelineId = result.pipeline_id || result.id || result.workflow_id;
      const versionId = result.version_id || result.current_version_id;
      
      console.log("Extracted IDs - Pipeline ID:", pipelineId, "Version ID:", versionId);
      
      if (!pipelineId || !versionId) {
        console.warn("Missing pipeline_id or version_id in response:", result);
        throw new Error("Pipeline created but missing IDs in response");
      }

      setSnackbar({
        open: true,
        message: `Pipeline saved successfully! ID: ${pipelineId}`,
        severity: "success",
      });
      
      // Trigger completion callback with the result
      if (onComplete) {
        console.log("Calling onComplete with:", {
          pipelineId,
          versionId,
          nodeCount: processedNodes.length,
          edgeCount: pipeline.edges.length,
        });
        onComplete({
          ...formData,
          nodes: processedNodes,
          edges: pipeline.edges,
          pipelineId: pipelineId,
          versionId: versionId,
        });
      }
      
      // Close drawer after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error saving final flowchart:", error);
      setSnackbar({
        open: true,
        message: `Failed to save pipeline: ${error.message}`,
        severity: "error",
      });
    }
  }, [formData, onComplete]);

  // Send user input to WebSocket
  const sendUserInput = useCallback((message) => {
    if (wsRef.current && wsConnected) {
      console.log("Sending user input to server:", message);
      wsRef.current.sendUserInput(message);
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: message },
      ]);
      setAwaitingInput(false);
      setIsGenerating(true); // Show generating while waiting for response
    } else {
      console.warn("Cannot send message: WebSocket not connected");
    }
  }, [wsConnected]);

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Step 4 (Done): Create workflow with all details using the new API
      setIsCreating(true); // Freeze button and show loading
      try {
        // Always use current nodes and edges state (includes user changes)
        // Remove any "proposed-" prefixes from node IDs
        const currentNodes = (nodes || []).map(node => {
          // Remove "proposed-" prefix if present
          const cleanId = node.id.startsWith("proposed-") 
            ? node.id.replace("proposed-", "") 
            : node.id;
          return {
            ...node,
            id: cleanId,
            data: {
              ...node.data,
              isProposed: false, // Ensure isProposed is false
            },
          };
        });
        
        // Clean up edges - remove "proposed-" prefix and ensure they reference valid nodes
        const currentEdges = (edges || []).map(edge => ({
          ...edge,
          source: edge.source?.startsWith("proposed-") 
            ? edge.source.replace("proposed-", "") 
            : edge.source,
          target: edge.target?.startsWith("proposed-") 
            ? edge.target.replace("proposed-", "") 
            : edge.target,
        })).filter(edge => {
          // Only keep edges where both source and target nodes exist
          const sourceExists = currentNodes.some(n => n.id === edge.source);
          const targetExists = currentNodes.some(n => n.id === edge.target);
          return sourceExists && targetExists;
        });
        
        // Get current viewport from ReactFlow instance
        let currentViewport = { x: 0, y: 0, zoom: 1 };
        if (rfInstanceRef.current) {
          try {
            const viewport = rfInstanceRef.current.getViewport();
            const zoom = rfInstanceRef.current.getZoom();
            currentViewport = {
              x: viewport.x || 0,
              y: viewport.y || 0,
              zoom: zoom || 1,
            };
          } catch (error) {
            console.warn("Error getting viewport:", error);
          }
        }
        
        // Extract viewer IDs from selected members
        const viewerIds = formData.selectedMembers.map((user) => String(user.id));
        
        // Process nodes before saving to ensure they're valid
        if (currentNodes.length > 0) {
          try {
            const { add_to_node_types } = await import("../../utils/pipelineUtils");
            await add_to_node_types(currentNodes);
          } catch (error) {
            console.warn("Error processing nodes before save:", error);
          }
        }
        
        console.log("Saving pipeline with current state:", {
          nodeCount: currentNodes.length,
          edgeCount: currentEdges.length,
          viewport: currentViewport,
          hasUserChanges: finalFlowchartRef.current 
            ? (currentNodes.length !== (finalFlowchartRef.current.nodes?.length || 0) ||
               currentEdges.length !== (finalFlowchartRef.current.edges?.length || 0))
            : false,
        });
        
        // Build pipeline structure using current state
        const pipeline = {
          nodes: currentNodes,
          edges: currentEdges,
          viewport: currentViewport,
        };

        // Call the new API to create pipeline with all details
        const result = await createPipelineWithDetails(
          formData.name,
          formData.description,
          viewerIds,
          pipeline
        );

        // Extract pipeline and version IDs from response
        const pipelineId = result.pipeline_id || result.id || result.workflow_id;
        const versionId = result.version_id || result.current_version_id || result.version_id;
        
        console.log("Pipeline created successfully:", {
          pipelineId,
          versionId,
          nodeCount: currentNodes.length,
          edgeCount: currentEdges.length,
        });

        // Show success message
        setSnackbar({
          open: true,
          message: "Pipeline created successfully!",
          severity: "success",
        });

        // Complete workflow creation - this will trigger refresh
      if (onComplete) {
        onComplete({
          ...formData,
            nodes: currentNodes,
            edges: currentEdges,
            pipelineId: pipelineId,
            versionId: versionId,
          });
        }

        // Close drawer and navigate to workflows page
      onClose();
        // Navigate to workflows page after a brief delay to ensure state is updated
        setTimeout(() => {
          navigate("/workflows");
        }, 300);
      } catch (error) {
        console.error("Error creating workflow:", error);
        setSnackbar({
          open: true,
          message: `Failed to create pipeline: ${error.message}`,
          severity: "error",
        });
        setIsCreating(false); // Re-enable button on error
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData({
      ...formData,
      document: file,
    });
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "current";
    return "pending";
  };

  // Handle nodes change from Playground (controlled mode)
  const handleNodesChange = useCallback((newNodes) => {
    setNodes(newNodes);
  }, []);

  // Handle edges change from Playground (controlled mode)
  const handleEdgesChange = useCallback((newEdges) => {
    setEdges(newEdges);
  }, []);

  // Handle workflow generation from AI chatbot
  const handleWorkflowGenerated = useCallback((generatedNodes, generatedEdges) => {
    if (generatedNodes && generatedEdges) {
      setNodes(generatedNodes);
      setEdges(generatedEdges);
    }
  }, []);

  // Pass WebSocket handlers to AIChatbot
  const handleChatbotMessage = useCallback((message) => {
    sendUserInput(message);
  }, [sendUserInput]);

  // Handle accept workflow from AI chatbot
  const handleAcceptWorkflow = useCallback(() => {
    // Automatically advance to next step when workflow is accepted
    if (currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep]);

  // Handle decline workflow from AI chatbot
  const handleDeclineWorkflow = useCallback(() => {
    // Reset nodes and edges if declined
    setNodes([]);
    setEdges([]);
  }, []);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <Box
          onClick={onClose}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0, 0, 0, 0.5)",
            zIndex: 11,
          }}
        />
      )}
      
      {/* Sliding Drawer */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: "100vh",
            width: "100vw",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              minHeight: "100vh",
              bgcolor: "background.paper",
              height: "100%",
              width: "100%",
              overflow: "hidden",
            }}
          >
            {/* Left Sidebar */}
            <StepSidebar
              steps={steps}
              currentStep={currentStep}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              getStepStatus={getStepStatus}
              formData={formData}
              onWorkflowGenerated={handleWorkflowGenerated}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              currentStepValue={currentStep}
              onAcceptWorkflow={handleAcceptWorkflow}
              onDeclineWorkflow={handleDeclineWorkflow}
              chatMessages={chatMessages}
              onSendMessage={handleChatbotMessage}
              awaitingInput={awaitingInput}
            />

            {/* Main Content - Full width, sidebar overlays for step 2+ */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
                minWidth: 0,
                overflow: "hidden",
                width: "100%",
                position: "relative",
                marginLeft: currentStep > 1 && isSidebarCollapsed ? `${STEP_SIDEBAR_COLLAPSED_WIDTH}px` : 0,
                transition: "margin-left 0.3s ease",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: "text.primary",
                  }}
                >
                  Create Workflow
                </Typography>
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Step 1: Basic Information Form */}
              {currentStep === 1 && (
                <Box
                  sx={{
                    flex: 1,
                    p: 4,
                    display: "flex",
                    justifyContent: "center",
                    overflow: "auto",
                  }}
                >
                  <Box sx={{ width: "100%", maxWidth: 600 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        color: "text.primary",
                        mb: 4,
                      }}
                    >
                      Basic Information
                    </Typography>

                    <BasicInformationForm
                      formData={formData}
                      onInputChange={handleInputChange}
                      onFileChange={handleFileChange}
                      allUsers={allUsers}
                      setAllUsers={setAllUsers}
                      loadingUsers={loadingUsers}
                      setLoadingUsers={setLoadingUsers}
                    />

                      {/* Navigation Buttons */}
                      <Box
                          sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 1.5,
                          mt: 2,
                        mb: 4,
                        }}
                      >
                        <Button
                          variant="text"
                          onClick={handleBack}
                          disabled={currentStep === 1}
                          sx={{
                            py: 1,
                            px: 3,
                            color: "primary.main",
                            textTransform: "none",
                            fontWeight: 500,
                              borderRadius: 2,
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                            "&:disabled": {
                              color: "text.disabled",
                            },
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                        disabled={isGenerating}
                          sx={{
                            py: 1,
                            px: 3,
                            bgcolor: "primary.main",
                            color: "common.white",
                            textTransform: "none",
                            fontWeight: 500,
                              borderRadius: 2,
                            boxShadow: "none",
                            "&:hover": {
                              bgcolor: "primary.dark",
                              boxShadow: "none",
                            },
                          "&:disabled": {
                            bgcolor: "action.disabledBackground",
                            color: "action.disabled",
                          },
                        }}
                      >
                        {isGenerating ? (
                          <>
                            <CircularProgress size={16} sx={{ mr: 1, color: "inherit" }} />
                            Generating...
                          </>
                        ) : (
                          "Next"
                        )}
                        </Button>
                      </Box>
                  </Box>
                </Box>
              )}

              {/* Step 2: AI Assistant - Show canvas with chatbot in sidebar */}
              {currentStep === 2 && (
                <Box
                          sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
                    <Playground
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onInit={(instance) => {
                        rfInstanceRef.current = instance;
                      }}
                      showToolbar={true}
                      showFullscreenButton={true}
                      height="100%"
                      drawerZIndex={10001}
                    />
                    {/* Node Approval Popup - Fixed in workspace near the node */}
                    {proposedNode && proposedNodePosition && rfInstanceRef.current && (
                      <Box
                            sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          pointerEvents: "none",
                          zIndex: 10000,
                        }}
                      >
                        <NodeApprovalPopup
                          nodeId={proposedNode.id}
                          isRendering={isRenderingNode}
                          position={(() => {
                            try {
                              // Convert ReactFlow coordinates to screen coordinates relative to the canvas
                              const rfInstance = rfInstanceRef.current;
                              const viewport = rfInstance.getViewport();
                              const zoom = rfInstance.getZoom();
                              
                              // Get ReactFlow container
                              const reactFlowContainer = document.querySelector('.react-flow');
                              const containerRect = reactFlowContainer?.getBoundingClientRect();
                              
                              if (!containerRect) {
                                throw new Error("ReactFlow container not found");
                              }
                              
                              // Get the node's screen position relative to the ReactFlow container
                              const nodeWidth = proposedNode.measured?.width || 200;
                              const nodeHeight = proposedNode.measured?.height || 100;
                              
                              // Calculate node center in flow coordinates
                              const nodeCenterX = proposedNodePosition.x + (nodeWidth / 2);
                              const nodeCenterY = proposedNodePosition.y + (nodeHeight / 2);
                              
                              // Convert to screen coordinates relative to ReactFlow container
                              const screenX = (nodeCenterX * zoom) + viewport.x;
                              const screenY = (nodeCenterY * zoom) + viewport.y;
                              
                              // Position dialog to the right of the node (in container coordinates)
                              const dialogX = screenX + (nodeWidth * zoom / 2) + 20;
                              const dialogY = screenY;
                              
                              // Ensure dialog is within container bounds
                              const containerWidth = containerRect.width;
                              const containerHeight = containerRect.height;
                              
                              let finalX = dialogX;
                              let finalY = dialogY;
                              
                              // If dialog would go outside right edge, position it to the left of node
                              if (finalX + 300 > containerWidth) {
                                finalX = screenX - (nodeWidth * zoom / 2) - 320; // 300px dialog width + 20px margin
                              }
                              
                              // Keep within bounds
                              finalX = Math.max(20, Math.min(finalX, containerWidth - 320));
                              finalY = Math.max(20, Math.min(finalY, containerHeight - 200));
                              
                              return { x: finalX, y: finalY };
                            } catch (error) {
                              console.error("Error calculating popup position:", error);
                              // Fallback: center of container
                              return { 
                                x: window.innerWidth * 0.6, 
                                y: window.innerHeight * 0.5 
                              };
                            }
                          })()}
                          onApprove={() => handleNodeApproval("approve")}
                          onReject={handleNodeRejection}
                        />
                      </Box>
                    )}
                      </Box>

                  {/* Navigation Buttons for AI Assistant Step */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 1.5,
                      p: 2,
                      borderTop: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                        }}
                      >
                        <Button
                          variant="text"
                          onClick={handleBack}
                          sx={{
                            py: 1,
                            px: 3,
                            color: "primary.main",
                            textTransform: "none",
                            fontWeight: 500,
                            borderRadius: 2,
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                            "&:disabled": {
                              color: "text.disabled",
                            },
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                      disabled={nodes.length === 0}
                          sx={{
                            py: 1,
                            px: 3,
                            bgcolor: "primary.main",
                            color: "common.white",
                            textTransform: "none",
                            fontWeight: 500,
                            borderRadius: 2,
                            boxShadow: "none",
                            "&:hover": {
                              bgcolor: "primary.dark",
                              boxShadow: "none",
                            },
                        "&:disabled": {
                          bgcolor: "action.disabledBackground",
                          color: "action.disabled",
                            },
                          }}
                        >
                          Next
                        </Button>
                  </Box>
                </Box>
              )}

              {/* Step 3: Nodes Setup - Playground Canvas */}
              {currentStep === 3 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ flex: 1, minHeight: 0 }}>
                    <Playground
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onInit={(instance) => {
                        rfInstanceRef.current = instance;
                      }}
                      showToolbar={true}
                      showFullscreenButton={true}
                      height="100%"
                      drawerZIndex={10001}
                    />
                  </Box>
                  
                  {/* Navigation Buttons for Canvas */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1.5,
                      p: 2,
                      borderTop: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Button
                      variant="text"
                      onClick={handleBack}
                      sx={{
                        py: 1,
                        px: 3,
                        color: "primary.main",
                        textTransform: "none",
                        fontWeight: 500,
                        borderRadius: 2,
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                        "&:disabled": {
                          color: "text.disabled",
                        },
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{
                        py: 1,
                        px: 3,
                        bgcolor: "primary.main",
                        color: "common.white",
                        textTransform: "none",
                        fontWeight: 500,
                        borderRadius: 2,
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "primary.dark",
                          boxShadow: "none",
                        },
                        "&:disabled": {
                          bgcolor: "action.disabledBackground",
                          color: "action.disabled",
                        },
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 4: Done - Preview and Create */}
              {currentStep === 4 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ flex: 1, minHeight: 0 }}>
                    <Playground
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onInit={(instance) => {
                        rfInstanceRef.current = instance;
                      }}
                      showToolbar={true}
                      showFullscreenButton={true}
                      height="100%"
                      drawerZIndex={10001}
                    />
                  </Box>
                  
                  {/* Navigation Buttons for Done Step */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1.5,
                      p: 2,
                      borderTop: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Button
                      variant="text"
                      onClick={handleBack}
                      disabled={isCreating}
                      sx={{
                        py: 1,
                        px: 3,
                        color: "primary.main",
                        textTransform: "none",
                        fontWeight: 500,
                        borderRadius: 2,
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                        "&:disabled": {
                          color: "text.disabled",
                        },
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={isCreating}
                      sx={{
                        py: 1,
                        px: 3,
                        bgcolor: "primary.main",
                        color: "common.white",
                        textTransform: "none",
                        fontWeight: 500,
                        borderRadius: 2,
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "primary.dark",
                          boxShadow: "none",
                        },
                        "&:disabled": {
                          bgcolor: "action.disabledBackground",
                          color: "action.disabled",
                        },
                      }}
                      startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Slide>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CreateWorkflowDrawer;


