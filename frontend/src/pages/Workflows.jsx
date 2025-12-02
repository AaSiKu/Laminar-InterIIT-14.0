import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "@xyflow/react/dist/style.css";
import { Box, Alert, Snackbar } from "@mui/material";

import { useGlobalContext } from "../context/GlobalContext";
import {
  savePipelineAPI,
  toggleStatus as togglePipelineStatus,
  spinupPipeline,
  spindownPipeline,
  saveDraftsAPI,
} from "../utils/pipelineUtils";
import PipelineNavBar from "../components/workflow/PipelineNavBar";
import Playground from "../components/workflow/Playground";

/**
 * Toggle status logic helper
 * TODO: need to fix this logic for setting status to Broken/Running/Stopped
 */
function toggleStatusLogic(variable) {
  return variable;
}

/**
 * WorkflowPage Component
 *
 * A page for editing and managing a specific pipeline workflow.
 * Uses the Playground component for the visual node editor and handles
 * pipeline-specific operations like save, run, spinup/spindown.
 */
export default function WorkflowPage() {
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { pipelineId } = useParams();

  const {
    currentEdges,
    currentNodes,
    setCurrentNodes,
    setRfInstance,
    setCurrentEdges,
    currentPipelineStatus,
    setCurrentPipelineStatus,
    setAgentContainerId,
    currentPipelineId,
    rfInstance,
    setCurrentPipelineId,
    loading,
    setLoading,
    error,
    setError,
    setViewport,
    containerId,
    setContainerId,
    currentVersionId,
    setCurrentVersionId,
  } = useGlobalContext();

  // Auto-save drafts when pipeline changes, TODO: check for debounce
  useEffect(() => {
    if (currentPipelineId) {
      setLoading(true);

      saveDraftsAPI(
        currentVersionId,
        rfInstance,
        setCurrentVersionId,
        setLoading,
        setError
      )
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [
    currentPipelineId,
    currentVersionId,
    setCurrentEdges,
    setCurrentNodes,
    setViewport,
    setCurrentPipelineStatus,
    setLoading,
    setError,
    setContainerId,
  ]);

  // Pipeline status toggle handler
  const handleToggleStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const newStatus = await togglePipelineStatus(
        currentPipelineId,
        currentPipelineStatus
      );
      setCurrentPipelineStatus(toggleStatusLogic(newStatus["status"]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Spin up pipeline container
  const handleSpinup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await spinupPipeline(currentPipelineId);
      setContainerId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Spin down pipeline container
  const handleSpindown = async () => {
    setLoading(true);
    setError(null);
    try {
      await spindownPipeline(currentPipelineId);
      setContainerId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save pipeline handler
  const handleSave = () => {
    savePipelineAPI(
      rfInstance,
      currentPipelineId,
      setCurrentPipelineId,
      currentVersionId,
      setCurrentVersionId,
      setError,
      setLoading
    );
  };

  // Share menu handlers
  const handleShareClick = (event) => {
    setShareAnchorEl(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareAnchorEl(null);
  };

  // Back navigation
  const handleBackClick = () => {
    navigate("/workflows");
  };

  // Handle nodes change from Playground
  const handleNodesChange = (newNodes) => {
    setCurrentNodes(newNodes);
  };

  // Handle edges change from Playground
  const handleEdgesChange = (newEdges) => {
    setCurrentEdges(newEdges);
  };

  const drawerWidth = 64;

  return (
    <>
      <Box
        sx={{
          transition: "margin-left 0.3s ease",
          left: drawerWidth,
          position: "absolute",
          width: `calc(100vw - ${drawerWidth}px)`,
          height: "100vh",
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        {/* Pipeline Navigation Bar */}
        <PipelineNavBar
          onBackClick={handleBackClick}
          pipelineName={`Pipeline ${
            pipelineId ? pipelineId.toLowerCase() : "a"
          }`}
          loading={loading}
          shareAnchorEl={shareAnchorEl}
          onShareClick={handleShareClick}
          onShareClose={handleShareClose}
          onSave={handleSave}
          onSpinup={handleSpinup}
          onSpindown={handleSpindown}
          onToggleStatus={handleToggleStatus}
          currentPipelineStatus={currentPipelineStatus}
          currentPipelineId={currentPipelineId}
          containerId={containerId}
        />

        {/* Playground - Visual Node Editor */}
        <Playground
          nodes={currentNodes}
          edges={currentEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onInit={setRfInstance}
          height="calc(100vh - 48px)"
          showToolbar={true}
          showFullscreenButton={true}
        />
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}


/**
   <Button
      variant="outlined"
      onClick={()=>{

        const pipelineId = "All"; // or "abc123" for a specific pipeline
        const wsUrl = `ws://localhost:8081/ws/pipeline/${pipelineId}`;
        const ws = new WebSocket(wsUrl);
        ws.onopen=()=>{console.log("ench")}
        ws.onmessage = (event) => {
            console.log("Notification received:", event.data);
        };

      }  }
      >
      test
    </Button>

 */