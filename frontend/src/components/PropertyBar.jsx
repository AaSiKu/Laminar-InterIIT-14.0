import { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  Alert,
  Snackbar,
} from "@mui/material";
import { PropertyInput } from "./PropertyInput";

const stringifyJsonProperties = (properties) =>
  properties.map((prop) => {
    if (prop.type === "json" && typeof prop.value === "object") {
      return { ...prop, value: JSON.stringify(prop.value, null, 2) };
    }
    return prop;
  });

const parseJsonProperties = (properties) =>
  properties.map((prop) => {
    if (prop.type === "json") {
      return { ...prop, value: JSON.parse(prop.value) };
    }
    return prop;
  });

export const PropertyBar = ({
  open,
  selectedNode,
  onClose,
  onUpdateProperties,
}) => {
  const [properties, setProperties] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (selectedNode?.data?.properties) {
      setProperties(stringifyJsonProperties(selectedNode.data.properties));
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
      try {
        const updatedProperties = parseJsonProperties(properties);
        onUpdateProperties(selectedNode.id, updatedProperties);
        setSnackbar({
          open: true,
          message: "Properties saved successfully!",
          severity: "success",
        });
        onClose();
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error parsing JSON. Please check the format.",
          severity: "error",
        });
      }
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
          {selectedNode
            ? `Properties for ${selectedNode.data.label}`
            : "Node Properties"}
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
              No properties found for this node.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2} component="form">
            {properties.map((prop, index) => (
              <PropertyInput
                key={index}
                property={prop}
                onChange={(e) => handleChange(index, e.target.value)}
              />
            ))}

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ mt: 2 }}
            >
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
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
