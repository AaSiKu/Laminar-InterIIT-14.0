import { useState, useEffect } from "react";
import Markdown from 'react-markdown';
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
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";

const stringifyJsonProperties = (properties) =>
  properties.map((prop) => {
    if (prop.type === "json" && typeof prop.value === "object") {
      return { ...prop, value: JSON.stringify(prop?.value, null, 2) };
    } else if (prop.type == "array") {
      return { ...prop, value: prop?.value?.split(",") };
    }
    return prop;
  });

// const parseProperties = (properties) =>
  // properties.map((prop) => {
  //   if (prop.type === "json") {
  //     return { ...prop, value: JSON.parse(prop.value) };
  //   } else if (prop.type === "array") {
  //     console.log(prop.value.toString().split(","));
  //     return { ...prop, value: prop?.value?.toString().split(",") };
  //   }
  //   return prop;
  // });


export const PropertyBar = ({
  open,
  selectedNode,
  onClose,
  onUpdateProperties,
  anchor = "right",
  drawerWidth = 500,
  variant = "temporary",
}) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // 1. Create the Custom Description Component
  const MarkdownDescriptionField = ({ description, id }) => {
    if (!description) {
      return null;
    }

    return (
      <div id={id}>
        {/* We use Typography so it matches your MUI theme font */}
        <Typography component="div" variant="body2" color="textSecondary">
          <Markdown>{description}</Markdown>
        </Typography>
      </div>
    );
  };

  console.log(selectedNode?.schema)

  const handleSave = ({ formData }) => {
    if (!selectedNode) return;

    // const hasEmptyRequired = properties.some((prop) => {
    //   if (prop.type === "json") {
    //     return !prop.value || !prop.value.toString().trim();
    //   }
    //   return `${prop.value ?? ""}`.trim() === "";
    // });

    // if (hasEmptyRequired) {
    //   setSnackbar({
    //     open: true,
    //     message: "Please complete all required properties before saving.",
    //     severity: "error",
    //   });
    //   return;
    // }

    try {
      onUpdateProperties(selectedNode.id, formData);
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
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Drawer
        anchor={anchor}
        open={open}
        onClose={onClose}
        variant={variant}
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            p: 3,
            bgcolor: "background.paper",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          },
        }}
      >
        {!selectedNode ? (
          <Alert severity="info">Select a node to view its properties.</Alert>
        ) : (
          <>
            <Form
              schema={selectedNode?.schema}
              validator={validator}
              initialFormData={selectedNode?.data?.properties}
              onSubmit={handleSave}
              templates={{
                DescriptionFieldTemplate: MarkdownDescriptionField,
              }}
            />
          </>
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
