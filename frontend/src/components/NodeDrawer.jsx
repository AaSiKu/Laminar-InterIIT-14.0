//TODO: Make the node accept only one input per handle 


import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Divider,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Extension,
  Close as CloseIcon,
} from "@mui/icons-material";
import { fetchNodeTypes, fetchNodeSchema } from "../utils/dashboard.api";
import "../css/NodeDrawer.css";

/**
 * Generates a consistent color for a given string (e.g. node name)
 * Hash → HSL color ensures deterministic and readable colors
 */
const getColorFromName = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`; // medium-saturation color
};

export const NodeDrawer = ({ open, onClose, onAddNode, onDragStart: onDragStartProp }) => {
  const [openSections, setOpenSections] = useState({});
  const [nodeCategories, setNodeCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [clickedNode, setClickedNode] = useState(null);

  // Fetch all node categories dynamically from backend
  useEffect(() => {
    const loadNodeTypes = async () => {
      try {
        setLoading(true);
        const data = await fetchNodeTypes();
        // data.input=["hello"];
        setNodeCategories(data || {});

        // clse all sections by default
        const initialOpen = Object.keys(data || {}).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {});
        setOpenSections(initialOpen);
      } catch (err) {
        console.error("Failed to load node types:", err);
      } finally {
        setLoading(false);
      }
    };
    loadNodeTypes();
  }, []);

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNodeClick = (nodeName) => {
    // Show drag and drop popup
    setClickedNode(nodeName);
    
    // Hide popup after 2 seconds
    setTimeout(() => {
      setClickedNode(null);
    }, 2000);
  };

  const onDragStart = (event, nodeName) => {
    event.dataTransfer.setData('application/reactflow', nodeName);
    event.dataTransfer.effectAllowed = 'move';
    
    // Close the drawer immediately when drag starts
    onClose();
    
    // Notify parent component if needed
    if (onDragStartProp) {
      onDragStartProp(nodeName);
    }
  };

  const renderCategory = (key, nodes = []) => (
    <Box key={key} sx={{ mb: 2 }}>
      {/* Header */}
      <Box
        onClick={() => toggleSection(key)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          p: 1,
          borderRadius: 1,
          "&:hover": { bgcolor: "#f5f5f5" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Extension sx={{ fontSize: 18, color: "#1976d2" }} />
          <Typography 
            variant="subtitle1" 
            fontWeight={600}
            sx={{ fontSize: "0.875rem" }}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Typography>
        </Box>
        <IconButton size="small">
          {openSections[key] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>
      <Divider sx={{ mb: 1.5 }} />

      {/* Node List */}
      <Collapse in={openSections[key]}>
        {loading ? (
          <Typography
            variant="body2"
            sx={{ 
              textAlign: "center", 
              color: "text.secondary",
              fontSize: "0.8125rem",
              py: 1.5
            }}
          >
            Loading...
          </Typography>
        ) : !nodes || nodes.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ 
              textAlign: "center", 
              color: "text.secondary",
              fontSize: "0.8125rem",
              py: 1.5
            }}
          >
            No nodes found.
          </Typography>
        ) : (
          <Grid
            container
            spacing={1}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
              gap: 1,
            }}
          >
            {nodes.map((nodeName, i) => (
              <Paper
                key={i}
                elevation={1}
                onClick={() => handleNodeClick(nodeName)}
                draggable
                onDragStart={(event) => onDragStart(event, nodeName)}
                sx={{
                  position: 'relative',
                  height: 95,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "grab",
                  borderRadius: 1.5,
                  border: "1px solid #e0e0e0",
                  transition: "0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    bgcolor: "#f5f5f5",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  },
                  "&:active": {
                    cursor: "grabbing",
                  },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: getColorFromName(nodeName),
                    width: 36,
                    height: 36,
                    mb: 0.75,
                    fontSize: 14,
                    textTransform: "uppercase",
                    pointerEvents: "none",
                  }}
                >
                  {nodeName[0]}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    wordBreak: "break-word",
                    fontSize: "0.75rem",
                    width: "100%",
                    px: 0.5,
                    pointerEvents: "none",
                    lineHeight: 1.3,
                  }}
                >
                  {nodeName}
                </Typography>
                
                {/* Drag and Drop Popup */}
                {clickedNode === nodeName && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(0, 0, 0, 0.85)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      animation: 'fadeInOut 2s ease-in-out',
                    }}
                  >
                    Drag and Drop
                  </Box>
                )}
              </Paper>
            ))}
          </Grid>
        )}
      </Collapse>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: 380,
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 3.5,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.125rem" }}>
          Add Nodes
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "#616161",
            "&:hover": { backgroundColor: "#f5f5f5" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ overflowY: "auto", px: 3, py: 2.5 }}>
        {Object.keys(nodeCategories).length === 0 && !loading ? (
          <Typography
            variant="body2"
            sx={{ 
              textAlign: "center", 
              color: "text.secondary",
              fontSize: "0.8125rem"
            }}
          >
            No node categories found.
          </Typography>
        ) : (
          Object.entries(nodeCategories).map(([key, nodes],idx) =>
            renderCategory(key, nodes)
          )
        )}
      </Box>
    </Drawer>
  );
};
