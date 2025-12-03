import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Button,
  IconButton,
  Slide,
  Box,
  TextField,
  useTheme,
  Autocomplete,
  Chip,
  Avatar,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import Playground from "../workflow/Playground";
import { fetchAllUsers, createPipelineWithDetails } from "../../utils/developerDashboard.api";

// Sidebar width matches the expanded nav sidebar
const STEP_SIDEBAR_WIDTH = 240;

// Stepper steps configuration
const steps = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "Nodes Setup" },
  { id: 3, label: "Done" },
];

const CreateWorkflowDrawer = ({ open, onClose, onComplete }) => {
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedMembers: [],
  });
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Pipeline nodes and edges state (managed here, passed to Playground)
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Load users when Autocomplete dropdown is opened
  const handleOpenAutocomplete = async () => {
    // Only fetch if we haven't loaded users yet
    if (allUsers.length === 0 && !loadingUsers) {
      setLoadingUsers(true);
      try {
        const users = await fetchAllUsers();
        // Handle both array response and object with data property
        const usersArray = Array.isArray(users) ? users : (users?.data || []);
        console.log("Loaded users:", usersArray); // Debug log
        console.log("Setting allUsers state with:", usersArray.length, "users");
        console.log("Users array:", JSON.stringify(usersArray, null, 2));
        setAllUsers(usersArray);
      } catch (error) {
        console.error("Error loading users:", error);
        setAllUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    } else {
      console.log("Users already loaded:", allUsers.length);
      console.log("Current allUsers:", allUsers);
    }
  };

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({ name: "", description: "", selectedMembers: [] });
      setNodes([]);
      setEdges([]);
    } else {
      // Reset users list when drawer closes to fetch fresh data next time
      setAllUsers([]);
      setLoadingUsers(false);
    }
  }, [open]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Step 3: Create workflow with all details using the new API
      try {
        // Extract viewer IDs from selected members
        const viewerIds = formData.selectedMembers.map((user) => String(user.id));
        
        // Build pipeline structure from nodes and edges
        const pipeline = {
          nodes: nodes || [],
          edges: edges || [],
          viewport: {
            x: 0,
            y: 0,
            zoom: 1
          }
        };

        // Call the new API to create pipeline with all details
        const result = await createPipelineWithDetails(
          formData.name,
          formData.description,
          viewerIds,
          pipeline
        );

        // Show success message
        setSnackbar({
          open: true,
          message: "Pipeline created successfully!",
          severity: "success",
        });

        // Complete workflow creation
        if (onComplete) {
          onComplete({
            ...formData,
            nodes,
            edges,
            pipelineId: result.pipeline_id,
            versionId: result.version_id,
          });
        }

        // Close drawer after a short delay to show the success message
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Error creating workflow:", error);
        setSnackbar({
          open: true,
          message: `Failed to create pipeline: ${error.message}`,
          severity: "error",
        });
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
            {/* Left Sidebar - matches expanded nav width */}
            <Box
              sx={{
                width: STEP_SIDEBAR_WIDTH,
                bgcolor: "background.paper",
                borderRight: "1px solid",
                borderColor: "divider",
                px: 3,
                pt: 4,
                pb: 3,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    mb: 3,
                  }}
                >
                  Details
                </Typography>
                
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {steps.map((step, index) => (
                    <Box key={step.id} sx={{ display: "flex", flexDirection: "column" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          py: 0.25,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {getStepStatus(step.id) === "completed" ? (
                            <CheckCircleIcon
                              sx={{
                                color: "success.main",
                                fontSize: 24,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                fontWeight: 500,
                                bgcolor: getStepStatus(step.id) === "current" 
                                  ? "primary.main" 
                                  : "grey.100",
                                color: getStepStatus(step.id) === "current" 
                                  ? "common.white" 
                                  : "text.primary",
                              }}
                            >
                              {step.id}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.125 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.primary",
                              fontWeight: getStepStatus(step.id) === "completed" ? 600 : 500,
                            }}
                          >
                            {step.label}
                          </Typography>
                        </Box>
                      </Box>
                      {index < steps.length - 1 && (
                        <Box
                          sx={{
                            width: 2,
                            height: 32,
                            ml: "11px",
                            my: 0.75,
                            borderRadius: 1,
                            bgcolor: getStepStatus(step.id) === "completed" 
                              ? "success.main" 
                              : (theme) => theme.palette.dividerLight,
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Main Content */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
                minWidth: 0,
                overflow: "hidden",
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

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                      {/* Name Field */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                        <Typography
                          component="label"
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: "text.primary",
                          }}
                        >
                          Name
                        </Typography>
                        <TextField
                          fullWidth
                          placeholder="Name"
                          value={formData.name}
                          onChange={handleInputChange("name")}
                          variant="filled"
                          InputProps={{
                            disableUnderline: true,
                          }}
                          sx={{
                            "& .MuiFilledInput-root": {
                              bgcolor: "background.elevation2",
                              borderRadius: 2,
                              "&:hover": { bgcolor: "background.elevation1" },
                              "&.Mui-focused": {
                                bgcolor: "background.elevation1",
                                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                              },
                            },
                            "& .MuiFilledInput-input": {
                              py: 1.5,
                              px: 2,
                              fontSize: "0.875rem",
                              "&::placeholder": { color: "text.secondary", opacity: 1 },
                            },
                          }}
                        />
                      </Box>

                      {/* Description Field */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                        <Typography
                          component="label"
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: "text.primary",
                          }}
                        >
                          Description
                        </Typography>
                        <TextField
                          fullWidth
                          placeholder="Description"
                          value={formData.description}
                          onChange={handleInputChange("description")}
                          variant="filled"
                          multiline
                          rows={4}
                          InputProps={{
                            disableUnderline: true,
                          }}
                          sx={{
                            "& .MuiFilledInput-root": {
                              bgcolor: "background.elevation2",
                              borderRadius: 2,
                              alignItems: "flex-start",
                              "&:hover": { bgcolor: "background.elevation1" },
                              "&.Mui-focused": {
                                bgcolor: "background.elevation1",
                                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                              },
                            },
                            "& .MuiFilledInput-input": {
                              py: 1.5,
                              px: 2,
                              fontSize: "0.875rem",
                              "&::placeholder": { color: "text.secondary", opacity: 1 },
                            },
                          }}
                        />
                      </Box>

                      {/* Members Field */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                        <Typography
                          component="label"
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: "text.primary",
                          }}
                        >
                          Members
                        </Typography>
                        <Autocomplete
                          multiple
                          options={allUsers || []}
                          value={formData.selectedMembers || []}
                          onOpen={(event) => {
                            console.log("Autocomplete opened, allUsers:", allUsers.length);
                            handleOpenAutocomplete();
                          }}
                          openOnFocus
                          disablePortal={true}
                          freeSolo={false}
                          disableCloseOnSelect
                          clearOnBlur={false}
                          onChange={(event, newValue) => {
                            console.log("Selected members:", newValue);
                            setFormData({
                              ...formData,
                              selectedMembers: newValue,
                            });
                          }}
                          onInputChange={(event, value, reason) => {
                            console.log("Input changed:", value, reason);
                            console.log("Current allUsers:", allUsers);
                          }}
                          getOptionLabel={(option) => {
                            if (!option || typeof option !== 'object') return "";
                            const name = option.full_name || option.name || `User ${option.id}`;
                            const email = option.email || "";
                            return email ? `${name} <${email}>` : name;
                          }}
                          isOptionEqualToValue={(option, value) => {
                            if (!option || !value) return false;
                            return String(option.id) === String(value.id);
                          }}
                          filterOptions={(options, params) => {
                            console.log("Filtering options:", options.length, "options");
                            const searchText = params.inputValue ? params.inputValue.toLowerCase().trim() : "";
                            if (!searchText) {
                              // Show all options when no search text
                              console.log("No search text, returning all", options.length, "options");
                              return options;
                            }
                            // Filter options based on search text
                            const filtered = options.filter((option) => {
                              if (!option) return false;
                              const name = (option.full_name || option.name || "").toLowerCase();
                              const email = (option.email || "").toLowerCase();
                              return name.includes(searchText) || email.includes(searchText);
                            });
                            console.log("Filtered to", filtered.length, "options");
                            return filtered;
                          }}
                          loading={loadingUsers}
                          noOptionsText={loadingUsers ? "Loading users..." : "No users found"}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="filled"
                              placeholder="Add Viewers"
                              InputProps={{
                                ...params.InputProps,
                                disableUnderline: true,
                              }}
                            sx={{
                                "& .MuiFilledInput-root": {
                              bgcolor: "background.elevation2",
                              borderRadius: 2,
                                  minHeight: "56px",
                              "&:hover": { bgcolor: "background.elevation1" },
                              "&.Mui-focused": {
                                bgcolor: "background.elevation1",
                                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                              },
                                },
                                "& .MuiFilledInput-input": {
                                py: 1.5,
                                px: 2,
                                fontSize: "0.875rem",
                                },
                              }}
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              const name = option.full_name || option.name || `User ${option.id}`;
                              const email = option.email || "";
                              return (
                                <Chip
                                  key={key}
                                  label={email ? `${name} <${email}>` : name}
                                  {...tagProps}
                                  sx={{
                                    bgcolor: "primary.light",
                                    color: "primary.contrastText",
                                    "& .MuiChip-deleteIcon": {
                                      color: "primary.contrastText",
                                    },
                                  }}
                                />
                              );
                            })
                          }
                          renderOption={(props, option) => {
                            if (!option) return null;
                            const name = option.full_name || option.name || `User ${option.id}`;
                            const email = option.email || "";
                            const avatarUrl = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(name || option.id || `user${option.id}`)}&size=40`;
                            
                            // Extract key from props if it exists
                            const { key, ...otherProps } = props;
                            
                            return (
                              <li {...otherProps} key={key || option.id}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    py: 1.5,
                                    px: 2,
                                    cursor: "pointer",
                                    width: "100%",
                                    "&:hover": {
                                      bgcolor: "action.hover",
                                    },
                                  }}
                                >
                                  <Avatar
                                    src={avatarUrl}
                                    alt={name}
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        color: "text.primary",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {name}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: "text.secondary",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {email}
                                    </Typography>
                                  </Box>
                                </Box>
                              </li>
                            );
                          }}
                          getOptionKey={(option) => String(option.id)}
                          slotProps={{
                            paper: {
                              sx: { 
                                zIndex: 10001,
                                maxHeight: 400,
                                boxShadow: 3,
                                mt: 1,
                                '& .MuiAutocomplete-listbox': {
                                  padding: 0,
                                  maxHeight: '400px',
                                  overflowY: 'auto',
                                  overflowX: 'hidden',
                                  '&::-webkit-scrollbar': {
                                    width: '8px',
                                  },
                                  '&::-webkit-scrollbar-track': {
                                    background: 'transparent',
                                  },
                                  '&::-webkit-scrollbar-thumb': {
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: '4px',
                                    '&:hover': {
                                      background: 'rgba(0, 0, 0, 0.3)',
                                    },
                                  },
                                  '& .MuiAutocomplete-option': {
                                    padding: 0,
                                  },
                                },
                              },
                            },
                            popper: {
                              placement: 'bottom-start',
                              disablePortal: true,
                              container: (anchorEl) => anchorEl?.parentElement || document.body,
                              modifiers: [
                                {
                                  name: 'offset',
                                  options: {
                                    offset: [0, 4],
                                  },
                                },
                              ],
                            },
                          }}
                          ListboxProps={{
                            style: {
                              maxHeight: '400px',
                              overflowY: 'auto',
                              overflowX: 'hidden',
                            },
                          }}
                          componentsProps={{
                            paper: {
                              sx: {
                                zIndex: 10001,
                              },
                            },
                          }}
                        />
                      </Box>

                      {/* Navigation Buttons */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 1.5,
                          mt: 2,
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
                          }}
                        >
                          Next
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Step 2: Nodes Setup - Playground Canvas */}
              {currentStep === 2 && (
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
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 3: Done - Preview and Create */}
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
                      }}
                    >
                      Create
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

