import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Button,
  IconButton,
  Slide,
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Playground from "../workflow/Playground";

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
    members: "",
  });

  // Pipeline nodes and edges state (managed here, passed to Playground)
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({ name: "", description: "", members: "" });
      setNodes([]);
      setEdges([]);
    }
  }, [open]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete workflow creation
      if (onComplete) {
        onComplete({
          ...formData,
          nodes,
          edges,
        });
      }
      onClose();
    }
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
                        <FormControl fullWidth variant="filled">
                          <Select
                            value={formData.members}
                            onChange={handleInputChange("members")}
                            displayEmpty
                            disableUnderline
                            IconComponent={KeyboardArrowDownIcon}
                            sx={{
                              bgcolor: "background.elevation2",
                              borderRadius: 2,
                              "&:hover": { bgcolor: "background.elevation1" },
                              "&.Mui-focused": {
                                bgcolor: "background.elevation1",
                                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                              },
                              "& .MuiSelect-select": {
                                py: 1.5,
                                px: 2,
                                fontSize: "0.875rem",
                                color: formData.members ? "text.primary" : "text.secondary",
                              },
                              "& .MuiSelect-icon": {
                                color: "text.secondary",
                                right: 12,
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: { zIndex: 10001 },
                              },
                            }}
                          >
                            <MenuItem value="" disabled>
                              Select members
                            </MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="developer">Developer</MenuItem>
                            <MenuItem value="viewer">Viewer</MenuItem>
                          </Select>
                        </FormControl>
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
    </>
  );
};

export default CreateWorkflowDrawer;

