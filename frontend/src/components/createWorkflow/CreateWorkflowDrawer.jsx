import { useState, useEffect, useCallback } from "react";
import { Typography, Slide, Box, IconButton, Button, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Playground from "../workflow/Playground";
import StepSidebar, { STEP_SIDEBAR_COLLAPSED_WIDTH } from "./StepSidebar";
import BasicInformationForm from "./BasicInformationForm";

// Stepper steps configuration
const steps = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "AI Assistant" },
  { id: 3, label: "Nodes Setup" },
  { id: 4, label: "Done" },
];

const CreateWorkflowDrawer = ({ open, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: "",
    document: null,
  });

  // Pipeline nodes and edges state (managed here, passed to Playground)
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // AI chatbot state
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({ name: "", description: "", members: "", document: null });
      setNodes([]);
      setEdges([]);
      setIsGenerating(false);
      setIsSidebarCollapsed(true);
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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData({
      ...formData,
      document: file,
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

  // Handle workflow generation from AI chatbot
  const handleWorkflowGenerated = useCallback((generatedNodes, generatedEdges) => {
    if (generatedNodes && generatedEdges) {
      setNodes(generatedNodes);
      setEdges(generatedEdges);
    }
  }, []);

  // Handle accept workflow from AI chatbot
  const handleAcceptWorkflow = useCallback(() => {
    // Automatically advance to next step when workflow is accepted
    if (currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep]);

  // Handle decline workflow from AI chatbot
  const handleDeclineWorkflow = useCallback(() => {
    // Reset nodes and edges if declined
    setNodes([]);
    setEdges([]);
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
            {/* Left Sidebar */}
            <StepSidebar
              steps={steps}
              currentStep={currentStep}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              getStepStatus={getStepStatus}
              formData={formData}
              onWorkflowGenerated={handleWorkflowGenerated}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              currentStepValue={currentStep}
              onAcceptWorkflow={handleAcceptWorkflow}
              onDeclineWorkflow={handleDeclineWorkflow}
            />

            {/* Main Content - Full width, sidebar overlays for step 2+ */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
                minWidth: 0,
                overflow: "hidden",
                width: "100%",
                position: "relative",
                marginLeft: currentStep > 1 && isSidebarCollapsed ? `${STEP_SIDEBAR_COLLAPSED_WIDTH}px` : 0,
                transition: "margin-left 0.3s ease",
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

                    <BasicInformationForm
                      formData={formData}
                      onInputChange={handleInputChange}
                      onFileChange={handleFileChange}
                    />

                    {/* Navigation Buttons */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1.5,
                        mt: 2,
                        mb: 4,
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
                        disabled={isGenerating}
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
                          "&:disabled": {
                            bgcolor: "action.disabledBackground",
                            color: "action.disabled",
                          },
                        }}
                      >
                        {isGenerating ? (
                          <>
                            <CircularProgress size={16} sx={{ mr: 1, color: "inherit" }} />
                            Generating...
                          </>
                        ) : (
                          "Next"
                        )}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Step 2: AI Assistant - Show canvas with chatbot in sidebar */}
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
                  
                  {/* Navigation Buttons for AI Assistant Step */}
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
                      disabled={nodes.length === 0}
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
                        "&:disabled": {
                          bgcolor: "action.disabledBackground",
                          color: "action.disabled",
                        },
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 3: Nodes Setup - Playground Canvas */}
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
                        "&:disabled": {
                          bgcolor: "action.disabledBackground",
                          color: "action.disabled",
                        },
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 4: Done - Preview and Create */}
              {currentStep === 4 && (
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
                        "&:disabled": {
                          bgcolor: "action.disabledBackground",
                          color: "action.disabled",
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


