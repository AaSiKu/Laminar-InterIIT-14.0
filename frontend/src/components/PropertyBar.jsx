import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  Divider,
  TextField,
  Button,
  Stack,
  Alert,
} from "@mui/material";

export const PropertyBar = ({
  open,
  selectedNode,
  onClose,
  onUpdateProperties,
}) => {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    if (selectedNode?.data?.properties) {
      setProperties(selectedNode.data.properties);
    } else {
      setProperties([]);
    }
  }, [selectedNode]);

  const handleChange = (index, value) => {
    const updated = [...properties];
    updated[index].value = value;
    setProperties(updated);
  };

  const handleSave = () => {
    onUpdateProperties(selectedNode.id, properties);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: 350,
          p: 3,
          bgcolor: "background.paper",
        },
      }}
    >
      <Typography variant="h6" gutterBottom>
        Node Properties
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {!selectedNode ? (
        <Alert severity="info">Select a node to view its properties.</Alert>
      ) : properties.length === 0 ? (
        <Alert severity="warning">This node has no editable properties.</Alert>
      ) : (
        <Stack spacing={2}>
          {properties.map((prop, index) => (
            <TextField
              key={index}
              label={prop.label}
              value={prop.value || ""}
              onChange={(e) => handleChange(index, e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
            />
          ))}
          <Button variant="contained" color="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </Stack>
      )}
    </Drawer>
  );
};
