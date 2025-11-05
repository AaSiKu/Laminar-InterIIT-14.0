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
  Snackbar,
} from "@mui/material";

export const PropertyBar = ({
  open,
  selectedNode,
  onClose,
  onUpdateProperties,
}) => {
  const [properties, setProperties] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (selectedNode?.data?.properties?.length > 0) {
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
    if (selectedNode) {
    onUpdateProperties(selectedNode.id, properties);
      setSnackbarOpen(true);
    }
    onClose();
  };

  const handleCancel = () => {
    if (selectedNode?.data?.properties) {
      setProperties(selectedNode.data.properties);
    }
    onClose();
  };

  return (
    <>
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
          <Box
            sx={{
              mt: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1" sx={{ mb: 1 }}>
              ⚙ No properties found for this node
            </Typography>
            <Typography variant="body2">
              You can search or add properties later.
            </Typography>
          </Box>
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

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" color="inherit" onClick={handleCancel}>
                Cancel
              </Button>
          <Button variant="contained" color="primary" onClick={handleSave}>
                Save
          </Button>
        </Stack>
          </Stack>
      )}
    </Drawer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message="✔ Node properties saved successfully"
        sx={{
          bottom: 40,
          "& .MuiSnackbarContent-root": {
            backgroundColor: "#4caf50",
            color: "white",
            fontSize: "0.85rem",
            padding: "6px 16px",
            borderRadius: "8px",
            minWidth: "unset",
          },
        }}
      />
    </>
  );
};
