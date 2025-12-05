import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Button,
  IconButton,
  Slide,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Playground from "../workflow/Playground";
import { fetchAllUsers } from "../../utils/developerDashboard.api";
import StepSidebar, { STEP_SIDEBAR_COLLAPSED_WIDTH } from "./StepSidebar";
import BasicInformationForm from "./BasicInformationForm";
import AddAIAgent from "./AddAIAgent";
import { create_pipeline, savePipelineAPI } from "../../utils/pipelineUtils";

// Stepper steps configuration
const steps = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "AI Assistant" },
  { id: 3, label: "Add AI Agents" },
];

const CreateWorkflowDrawer = ({ open, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: "",
    document: null,
    selectedMembers: [],
    agent: [],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Pipeline nodes and edges state (managed here, passed to Playground)
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const [agents, setAgents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // AI chatbot state
  const [isGenerating, setIsGenerating] = useState(false);

  // TODO: not to do so Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({
        name: "",
        description: "",
        members: "",
        document: null,
        agent: [],
        selectedMembers: [],
      });
      setNodes([]);
      setEdges([]);
      setRfInstance(null);
      setAgents([]);
      setIsGenerating(false);
      setIsSidebarCollapsed(true);
      setIsCreating(false);
    }
  }, [open]);

  // Automatically open sidebar when reaching step 2, close on step 3
  useEffect(() => {
    if (currentStep === 2) {
      setIsSidebarCollapsed(false);
    } else if (currentStep === 3) {
      setIsSidebarCollapsed(true);
    }
  }, [currentStep]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - create the pipeline
      setIsCreating(true);
      try {
        // Extract viewer IDs from selected members
        const viewerIds = formData.selectedMembers.map((user) =>
          String(user.id)
        );

        // Get viewport from rfInstance if available
        let viewport = { x: 0, y: 0, zoom: 1 };
        if (rfInstance) {
          const flowData = rfInstance.toObject();
          viewport = flowData.viewport || viewport;
        }

        // Build pipeline structure from nodes and edges
        const pipeline = {
          nodes: nodes || [],
          edges: edges || [],
          agents: agents || [],
          viewport: viewport,
        };

        // Step 1: Create the pipeline
        let newPipelineId = null;
        let newVersionId = null;

        await create_pipeline(
          formData.name || "New Workflow",
          (id) => {
            newPipelineId = id;
          },
          (id) => {
            newVersionId = id;
          },
          (error) => {
            throw new Error(error);
          },
          () => {} // setLoading - we handle our own loading state
        );

        if (!newPipelineId || !newVersionId) {
          throw new Error("Failed to create pipeline - no ID returned");
        }

        // Step 2: Save the pipeline with nodes, edges, and viewport
        const saveResponse = await fetch(
          `${import.meta.env.VITE_API_SERVER}/version/save`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              version_updated_at: new Date().toISOString(),
              version_description: formData.description || "",
              current_version_id: newVersionId,
              workflow_id: newPipelineId,
              pipeline: pipeline,
            }),
          }
        );

        if (!saveResponse.ok) {
          const errText = await saveResponse.text();
          throw new Error(
            `Failed to save pipeline: ${errText || saveResponse.status}`
          );
        }

        const saveData = await saveResponse.json();

        // Show success message
        setSnackbar({
          open: true,
          message: "Pipeline created successfully!",
          severity: "success",
        });

        // Get the final pipeline ID
        const finalPipelineId = saveData.workflow_id || newPipelineId;

        // Complete workflow creation
        if (onComplete) {
          onComplete({
            name: formData.name,
            description: formData.description,
            selectedMembers: formData.selectedMembers,
            viewerIds: viewerIds,
            nodes,
            edges,
            viewport,
            agents,
            pipelineId: finalPipelineId,
            versionId: saveData.version_id || newVersionId,
          });
        }

        // Close drawer and redirect to the workflow page after a short delay
        setTimeout(() => {
          onClose();
          // Navigate to the workflow page and refresh
          navigate(`/workflows/${finalPipelineId}`);
          // FIX: Force a full page refresh to ensure all state is updated
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Error creating workflow:", error);
        setSnackbar({
          open: true,
          message: `Failed to create pipeline: ${error.message}`,
          severity: "error",
        });
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      document: file,
    }));
  };

  // Handle members selection change
  const handleMembersChange = useCallback((newMembers) => {
    setFormData((prev) => ({
      ...prev,
      selectedMembers: newMembers,
    }));
  }, []);

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

  // Handle Playground init to get rfInstance
  const handlePlaygroundInit = useCallback((instance) => {
    setRfInstance(instance);
  }, []);

  // Handle agents change from AddAIAgent
  const handleAgentsChange = useCallback((newAgents) => {
    setAgents(newAgents);
  }, []);

  // Handle workflow generation from AI chatbot
  const handleWorkflowGenerated = useCallback(
    (generatedNodes, generatedEdges) => {
      if (generatedNodes && generatedEdges) {
        setNodes(generatedNodes);
        setEdges(generatedEdges);
      }
    },
    []
  );

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
              onToggleCollapse={() =>
                setIsSidebarCollapsed(!isSidebarCollapsed)
              }
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
                marginLeft:
                  currentStep > 1 && isSidebarCollapsed
                    ? `${STEP_SIDEBAR_COLLAPSED_WIDTH}px`
                    : 0,
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
                      onMembersChange={handleMembersChange}
                      allUsers={allUsers}
                      setAllUsers={setAllUsers}
                      loadingUsers={loadingUsers}
                      setLoadingUsers={setLoadingUsers}
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
                            <CircularProgress
                              size={16}
                              sx={{ mr: 1, color: "inherit" }}
                            />
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
                      onInit={handlePlaygroundInit}
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

              {/* Step 3: Nodes Setup - Add AI Agent Form */}
              {currentStep === 3 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "auto",
                    px: 3,
                    py: 4,
                    position: "relative",
                    zIndex: 1,
                    pointerEvents: "auto",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ width: "100%", maxWidth: 600 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        mb: 3,
                      }}
                    >
                      Add AI Agents
                    </Typography>

                    <AddAIAgent
                      formData={formData}
                      onInputChange={handleInputChange}
                      onSelectChange={handleSelectChange}
                      onAgentsChange={handleAgentsChange}
                      nodes={nodes}
                    />
                  </Box>

                  {/* Navigation Buttons */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1.5,
                      p: 2,
                      bgcolor: "background.paper",
                      width: "100%",
                      maxWidth: 600,
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
                      disabled={isCreating}
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
                      {isCreating ? (
                        <>
                          <CircularProgress
                            size={16}
                            sx={{ mr: 1, color: "inherit" }}
                          />
                          Creating...
                        </>
                      ) : (
                        "Create"
                      )}
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
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ zIndex: 10000 }}
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
