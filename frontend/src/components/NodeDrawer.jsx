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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Extension,
  Close as CloseIcon,
  Search as SearchIcon,
  Login as InputIcon,
  Autorenew as TransformIcon,
  Launch as OutputIcon,
  ViewList as ViewListIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { fetchNodeTypes, fetchNodeSchema } from "../utils/dashboard.api";
import "../css/NodeDrawer.css";
import inputIcon from "../assets/input.png";
import transformIcon from "../assets/Transform.png";
import jointIcon from "../assets/joint.png";

/**
 * Get icon for category type
 */
const getCategoryIcon = (category) => {
  const iconProps = { sx: { fontSize: 20, color: "#77878F" } };
  
  switch (category.toLowerCase()) {
    case 'input':
      return <InputIcon {...iconProps} />;
    case 'output':
      return <OutputIcon {...iconProps} />;
    case 'transform':
    case 'table':
    case 'temporal':
      return <TransformIcon {...iconProps} />;
    default:
      return <Extension {...iconProps} />;
  }
};

/**
 * Get image for individual node based on category
 */
const getNodeImage = (category) => {
  switch (category.toLowerCase()) {
    case 'input':
    case 'output':
    case 'io':
      return inputIcon;
    case 'agent':
    case 'action':
      return transformIcon;
    case 'table':
    case 'temporal':
    case 'transform':
      return jointIcon;
    default:
      return inputIcon;
  }
};

/**
 * Handle image load errors
 */
const handleImageError = (nodeId) => {
  setImageErrors(prev => ({ ...prev, [nodeId]: true }));
};

export const NodeDrawer = ({ open, onClose, onAddNode, onDragStart: onDragStartProp }) => {
  const [openSections, setOpenSections] = useState({});
  const [nodeCategories, setNodeCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [clickedNode, setClickedNode] = useState(null);
  const [activeTab, setActiveTab] = useState(1); // Default to "All Files" tab
  const [searchQuery, setSearchQuery] = useState("");
  const [recentNodes, setRecentNodes] = useState([]);
  const [imageErrors, setImageErrors] = useState({});

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
    
    // Add to recent nodes
    setRecentNodes((prev) => {
      const filtered = prev.filter(n => n !== nodeName);
      return [nodeName, ...filtered].slice(0, 10); // Keep last 10
    });
    
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

  const renderCategory = (key, nodes = []) => {
    // Filter nodes based on search query
    const filteredNodes = nodes.filter(node => 
      node.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (searchQuery && filteredNodes.length === 0) return null;
    
    return (
      <Box key={key} sx={{ mb: 2 }}>
        {/* Header */}
        <Box
          onClick={() => toggleSection(key)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            px: 2,
            py: 1.5,
            borderRadius: 1,
            "&:hover": { bgcolor: "#f9fafb" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {getCategoryIcon(key)}
            <Typography 
              variant="subtitle1" 
              fontWeight={600}
              sx={{ 
                fontSize: "0.875rem",
                color: "#374151"
              }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: "#77878F" }}>
            {openSections[key] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </Box>

      {/* Node List */}
      <Collapse in={openSections[key]}>
        {loading ? (
          <Typography
            variant="body2"
            sx={{ 
              textAlign: "center", 
              color: "#9ca3af",
              fontSize: "0.8125rem",
              py: 1.5,
              px: 2
            }}
          >
            Loading...
          </Typography>
        ) : !filteredNodes || filteredNodes.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ 
              textAlign: "center", 
              color: "#9ca3af",
              fontSize: "0.8125rem",
              py: 1.5,
              px: 2
            }}
          >
            No nodes found.
          </Typography>
        ) : (
          <Grid
            container
            spacing={1.5}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 1.5,
              px: 2,
              pb: 1.5
            }}
          >
            {filteredNodes.map((nodeName, i) => (
              <Box
                key={i}
                onClick={() => handleNodeClick(nodeName)}
                draggable
                onDragStart={(event) => onDragStart(event, nodeName)}
                sx={{
                  position: 'relative',
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  "&:active": {
                    cursor: "grabbing",
                  },
                }}
              >
                {/* Image Container with Gray Background */}
                <Paper
                  elevation={0}
                  sx={{
                    width: "100%",
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                    bgcolor: "#F7FAFC",
                    border: "1px solid #e5e7eb",
                    transition: "all 0.2s ease",
                    mb: 1,
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                      borderColor: "#d1d5db",
                    },
                        }}
                      >
                        {imageErrors[nodeName] ? (
                          <Typography
                            sx={{
                              fontSize: "2rem",
                              fontWeight: 600,
                              color: "#77878F",
                              pointerEvents: "none",
                            }}
                          >
                            →
                          </Typography>
                        ) : (
                          <img
                            src={getNodeImage(key)}
                            alt={nodeName}
                            onError={() => handleImageError(nodeName)}
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "contain",
                              pointerEvents: "none",
                            }}
                          />
                        )}
                  
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
                        borderRadius: '6px',
                        fontSize: "0.6875rem",
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
                
                {/* Text Outside Gray Background */}
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    wordBreak: "break-word",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#374151",
                    width: "100%",
                    px: 1,
                    pointerEvents: "none",
                    lineHeight: 1.3,
                    mb: 0.5,
                  }}
                >
                  {nodeName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    textAlign: "center",
                    fontSize: "0.6875rem",
                    fontWeight: 400,
                    color: "#9ca3af",
                    pointerEvents: "none",
                  }}
                >
                  ID: {nodeName.split('_')[0]}
                </Typography>
              </Box>
            ))}
          </Grid>
        )}
      </Collapse>
    </Box>
  );
};

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: 400,
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          top: "48px", // Below the topmost Laminar navbar
          height: "calc(100vh - 48px)",
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
          py: 2.5,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", color: "#1f2937" }}>
          All Nodes
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "#77878F",
            "&:hover": { backgroundColor: "#f3f4f6" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: "1px solid #e5e7eb" }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            minHeight: 40,
            px: 2,
            "& .MuiTab-root": {
              minHeight: 40,
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              color: "#6b7280",
              "&.Mui-selected": {
                color: "#1f2937",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#3b82f6",
            },
          }}
        >
          <Tab label="Recent" />
          <Tab label="All Files" />
        </Tabs>
      </Box>

      {/* Search Bar */}
      <Box sx={{ px: 3, py: 2 }}>
        <TextField
          fullWidth
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#f9fafb",
              fontSize: "0.875rem",
              "& fieldset": {
                borderColor: "#e5e7eb",
              },
              "&:hover fieldset": {
                borderColor: "#d1d5db",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#3b82f6",
              },
            },
          }}
        />
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {activeTab === 0 ? (
          // Recent Tab
          <Box sx={{ px: 1 }}>
            {recentNodes.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ 
                  textAlign: "center", 
                  color: "#9ca3af",
                  fontSize: "0.8125rem",
                  py: 4
                }}
              >
                No recent nodes
              </Typography>
            ) : (
              <Box sx={{ px: 2, py: 1 }}>
                <Grid
                  container
                  spacing={1.5}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1.5,
                  }}
                >
                  {recentNodes.map((nodeName, i) => (
                    <Box
                      key={i}
                      onClick={() => handleNodeClick(nodeName)}
                      draggable
                      onDragStart={(event) => onDragStart(event, nodeName)}
                      sx={{
                        position: 'relative',
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        cursor: "grab",
                        transition: "all 0.2s ease",
                        "&:active": {
                          cursor: "grabbing",
                        },
                      }}
                    >
                      {/* Image Container with Gray Background */}
                      <Paper
                        elevation={0}
                        sx={{
                          width: "100%",
                          height: 100,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 2,
                          bgcolor: "#F7FAFC",
                          border: "1px solid #e5e7eb",
                          transition: "all 0.2s ease",
                          mb: 1,
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                            borderColor: "#d1d5db",
                          },
                        }}
                      >
                        {imageErrors[`recent-${nodeName}`] ? (
                          <Typography
                            sx={{
                              fontSize: "2rem",
                              fontWeight: 600,
                              color: "#77878F",
                              pointerEvents: "none",
                            }}
                          >
                            →
                          </Typography>
                        ) : (
                          <img
                            src={inputIcon}
                            alt={nodeName}
                            onError={() => handleImageError(`recent-${nodeName}`)}
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "contain",
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </Paper>
                      
                      {/* Text Outside Gray Background */}
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: "center",
                          wordBreak: "break-word",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#374151",
                          width: "100%",
                          px: 1,
                          pointerEvents: "none",
                          lineHeight: 1.3,
                          mb: 0.5,
                        }}
                      >
                        {nodeName}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          textAlign: "center",
                          fontSize: "0.6875rem",
                          fontWeight: 400,
                          color: "#9ca3af",
                          pointerEvents: "none",
                        }}
                      >
                        ID: {nodeName.split('_')[0]}
                      </Typography>
                    </Box>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        ) : (
          // All Files Tab
          <Box>
            {Object.keys(nodeCategories).length === 0 && !loading ? (
              <Typography
                variant="body2"
                sx={{ 
                  textAlign: "center", 
                  color: "#9ca3af",
                  fontSize: "0.8125rem",
                  py: 4
                }}
              >
                No node categories found.
              </Typography>
            ) : (
              Object.entries(nodeCategories).map(([key, nodes]) =>
                renderCategory(key, nodes)
              )
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
