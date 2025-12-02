import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Button,
  Stack,
  Alert,
  Snackbar,
  TextField,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  useTheme,
} from "@mui/material";
import {
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarTodayIcon,
} from "@mui/icons-material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import "../../css/PropertyBar.css";


export const PropertyBar = ({
  open,
  selectedNode,
  onClose,
  onUpdateProperties,
  anchor = "right",
  drawerWidth = "25vw", // 25% of viewport width
  variant = "temporary",
  readOnly = false,
}) => {
  const theme = useTheme();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Filter out non-editable fields from schema
  const getEditableSchema = (schema) => {
    if (!schema || !schema.properties) return schema;
    
    const filteredSchema = {
      ...schema,
      properties: { ...schema.properties },
      required: schema.required ? [...schema.required] : [],
    };
    
    // Remove node_id, category from properties (keep n_inputs to display but will be disabled)
    delete filteredSchema.properties.node_id;
    delete filteredSchema.properties.category;
    
    // Remove from required array if present
    filteredSchema.required = filteredSchema.required.filter(
      field => !['node_id', 'category'].includes(field)
    );
    
    return filteredSchema;
  };

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

  console.log(selectedNode?.schema);

  const handleSave = ({ formData }) => {
    if (!selectedNode) return;

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
        variant="persistent"
        className="property-bar-drawer"
        hideBackdrop
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          "& .MuiDrawer-paper": {
            width: "450px",
            backgroundColor: 'background.paper',
            boxShadow: theme.shadows[4],
            borderLeft: "1px solid",
            borderColor: 'divider',
            zIndex: 1400,
            top: "48px",
            height: "calc(100vh - 48px)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            padding: "40px",
            display: "flex",
            justifyContent: "space-between",
          },
        }}
      >
        {!selectedNode ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Select a node to view its properties.
            </Alert>
          </Box>
        ) : (
          <Box
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {/* Category and Node ID on same line - Read only */}
              <Box sx={{ mb: 1.5, display: 'flex', gap: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      mb: 0.5,
                      display: "block",
                    }}
                  >
                    Category
                  </Typography>
                  <TextField
                    fullWidth
                    value={selectedNode?.category || selectedNode?.data?.properties?.category || "General"}
                    variant="outlined"
                    disabled
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: 'background.elevation1',
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        "& fieldset": { borderColor: 'divider' },
                        "& input": {
                          padding: "6px 8px",
                          fontSize: "0.75rem",
                          height: "auto",
                        },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      mb: 0.5,
                      display: "block",
                    }}
                  >
                    Node ID
                  </Typography>
                  <TextField
                    fullWidth
                    value={selectedNode?.node_id || selectedNode?.data?.properties?.node_id || "N/A"}
                    variant="outlined"
                    disabled
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: 'background.elevation1',
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        "& fieldset": { borderColor: 'divider' },
                        "& input": {
                          padding: "6px 8px",
                          fontSize: "0.75rem",
                          height: "auto",
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* N Inputs - Read only */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 0.5,
                    display: "block",
                  }}
                >
                  N Inputs
                </Typography>
                <TextField
                  fullWidth
                  value={selectedNode?.data?.properties?.n_inputs || "0"}
                  variant="outlined"
                  disabled
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: 'background.elevation1',
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      "& fieldset": { borderColor: 'divider' },
                      "& input": {
                        padding: "6px 8px",
                        fontSize: "0.75rem",
                        height: "auto",
                      },
                    },
                  }}
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Properties Form */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 1,
                    display: "block",
                  }}
                >
                  Properties
                </Typography>
                <div className="property-bar-form-content" style={{ 
                  '& .MuiTextField-root': { marginBottom: '8px' },
                  '& .MuiFormControl-root': { marginBottom: '8px' },
                }}>
                  <Form
                    schema={getEditableSchema(selectedNode?.schema)}
                    validator={validator}
                    formData={selectedNode?.data?.properties}
                    onSubmit={handleSave}
                    onClose={onClose}
                    disabled={readOnly}
                    templates={{
                      DescriptionFieldTemplate: MarkdownDescriptionField,
                    }}
                  ></Form>
                </div>
              </Box>
            </Box>
          </Box>
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
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
