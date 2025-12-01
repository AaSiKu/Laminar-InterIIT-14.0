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
}) => {
  const theme = useTheme();
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
            width: drawerWidth,
            backgroundColor: 'background.paper',
            boxShadow: theme.shadows[4],
            border: "1px solid",
            borderColor: 'divider',
            borderLeft: "none",
            zIndex: 1400,
            top: "48px",
            height: "calc(100vh - 48px)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 3,
                py: 3.5,
                borderBottom: "1px solid",
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, fontSize: "1.125rem", color: "text.primary" }}
              >
                Property Editor
              </Typography>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  color: "text.secondary",
                  "&:hover": { backgroundColor: 'action.hover' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
              {/* Node Title */}
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    fontSize: "0.6875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 0.75,
                    display: "block",
                  }}
                >
                  Title
                </Typography>
                <TextField
                  fullWidth
                  value={selectedNode?.data?.ui?.label || "Node"}
                  variant="outlined"
                  disabled
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: 'background.elevation1',
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      "& fieldset": { borderColor: 'divider' },
                      "& input": {
                        padding: "10px 12px",
                        fontSize: "0.8125rem",
                      },
                    },
                  }}
                />
              </Box>

              {/* Category Chip */}
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.6875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 0.75,
                    display: "block",
                  }}
                >
                  Category
                </Typography>
                <Chip
                  label={selectedNode?.data?.properties?.category || "General"}
                  color="primary"
                  variant="soft"
                  sx={{
                    fontWeight: 500,
                    borderRadius: "6px",
                    height: "26px",
                    fontSize: "0.75rem",
                  }}
                />
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Properties Form */}
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    fontSize: "0.6875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    mb: 1.5,
                    display: "block",
                  }}
                >
                  Properties
                </Typography>
                <div className="property-bar-form-content">
                  <Form
                    schema={selectedNode?.schema}
                    validator={validator}
                    formData={selectedNode?.data?.properties}
                    onSubmit={handleSave}
                    onClose={onClose}
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
