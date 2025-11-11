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
} from "@mui/icons-material";
import { fetchNodeTypes, fetchNodeSchema } from "../utils/dashboard.api";

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

export const NodeDrawer = ({ open, onClose, onAddNode }) => {
  const [openSections, setOpenSections] = useState({});
  const [nodeCategories, setNodeCategories] = useState({});
  const [loading, setLoading] = useState(true);

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

  const handleAddNode = async (nodeName) => {
    try {
      const schema = await fetchNodeSchema(nodeName);
      onAddNode(schema);
      onClose();
    } catch (err) {
      console.error("Failed to add node:", err);
    }
  };

  const renderCategory = (key, nodes = []) => (
    <Box key={key}>
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
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Extension color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Typography>
        </Box>
        <IconButton size="small">
          {openSections[key] ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* Node List */}
      <Collapse in={openSections[key]}>
        {loading ? (
          <Typography
            variant="body2"
            sx={{ textAlign: "center", color: "text.secondary" }}
          >
            Loading...
          </Typography>
        ) : !nodes || nodes.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ textAlign: "center", color: "text.secondary" }}
          >
            No nodes found.
          </Typography>
        ) : (
          <Grid
            container
            spacing={1}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 1,
            }}
          >
            {nodes.map((nodeName, i) => (
              <Paper
                key={i}
                elevation={2}
                onClick={() => handleAddNode(nodeName)}
                sx={{
                  height: 110,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: 2,
                  transition: "0.2s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: getColorFromName(nodeName),
                    width: 42,
                    height: 42,
                    mb: 1,
                    fontSize: 16,
                    textTransform: "uppercase",
                  }}
                >
                  {nodeName[0]}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    wordBreak: "break-word",
                    fontSize: "0.8rem",
                    width: "100%",
                  }}
                >
                  {nodeName}
                </Typography>
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
          width: 400,
          p: 3,
          boxSizing: "border-box",
          overflowY: "auto",
          backgroundColor: "background.paper",
        },
      }}
    >
      <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
        Add Nodes
      </Typography>

      {Object.keys(nodeCategories).length === 0 && !loading ? (
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "text.secondary" }}
        >
          No node categories found.
        </Typography>
      ) : (
        Object.entries(nodeCategories).map(([key, nodes],idx) =>
          renderCategory(key, nodes)
        )
      )}
    </Drawer>
  );
};
