import { useState, useEffect, useCallback, useRef } from "react";
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
import RunBook from "../components/workflow/RunBook";

/**
 * Toggle status logic helper
 * TODO: need to fix this logic for setting status to Broken/Running/Stopped
 */
function toggleStatusLogic(variable) {
  return variable;
}

// Drawer width constant
export const DRAWER_WIDTH = 64;

/**
 * WorkflowPage Component
 *
 * A page for editing and managing a specific pipeline workflow.
 * Uses the Playground component for the visual node editor and handles
 * pipeline-specific operations like save, run, spinup/spindown.
 */
export default function WorkflowPage() {
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRunBookOpen, setRunBookOpen] = useState(false);
  const playgroundRef = useRef(null);
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
    currentPipelineId,
    rfInstance,
    setCurrentPipelineId,
    loading,
    setLoading,
    error,
    setError,
    containerId,
    setContainerId,
    currentVersionId,
    setCurrentVersionId,
    user,
  } = useGlobalContext();

  // Auto-save drafts when pipeline changes
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
    rfInstance,
    setCurrentVersionId,
    setLoading,
    setError,
  ]);

  // Pipeline status toggle handler
  const handleToggleStatus = useCallback(async () => {
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
  }, [
    currentPipelineId,
    currentPipelineStatus,
    setCurrentPipelineStatus,
    setLoading,
    setError,
  ]);

  // Spin up pipeline container
  const handleSpinup = useCallback(async () => {
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
  }, [currentPipelineId, setContainerId, setLoading, setError]);

  // Spin down pipeline container
  const handleSpindown = useCallback(async () => {
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
  }, [currentPipelineId, setContainerId, setLoading, setError]);

  // Save pipeline handler
  const handleSave = useCallback(() => {
    savePipelineAPI(
      rfInstance,
      currentPipelineId,
      setCurrentPipelineId,
      currentVersionId,
      setCurrentVersionId,
      setError,
      setLoading
    );
  }, [
    rfInstance,
    currentPipelineId,
    setCurrentPipelineId,
    currentVersionId,
    setCurrentVersionId,
    setError,
    setLoading,
  ]);

  // Share menu handlers
  const handleShareClick = useCallback((event) => {
    setShareAnchorEl(event.currentTarget);
  }, []);

  const handleShareClose = useCallback(() => {
    setShareAnchorEl(null);
  }, []);

  // Export JSON handler
  const handleExportJSON = useCallback(() => {
    if (!rfInstance) {
      setError("No workflow data available to export");
      return;
    }

    try {
      const flowData = rfInstance.toObject();
      const exportData = {
        ...flowData,
        metadata: {
          pipelineName: `Pipeline ${
            pipelineId ? pipelineId.toLowerCase() : "a"
          }`,
          pipelineId: currentPipelineId,
          versionId: currentVersionId,
          exportedAt: new Date().toISOString(),
          exportedBy: user?.name || user?.id || "Unknown",
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pipeline-${pipelineId || "workflow"}-${
        new Date().toISOString().split("T")[0]
      }.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Failed to export workflow. Please try again.");
    }
  }, [
    rfInstance,
    pipelineId,
    currentPipelineId,
    currentVersionId,
    user,
    setError,
  ]);

  // Navigation handler
  const handleBackClick = useCallback(() => {
    navigate("/workflows");
  }, [navigate]);

  // Fullscreen handlers
  const handleEnterFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Keyboard shortcut for fullscreen (F key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "f" || e.key === "F") {
        if (!isFullscreen) {
          handleEnterFullscreen();
        }
      }

      if (e.key === "Escape" && isFullscreen) {
        handleExitFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, handleEnterFullscreen, handleExitFullscreen]);

  // Node/Edge change handlers for controlled mode
  const handleNodesChange = useCallback(
    (newNodes) => {
      setCurrentNodes(newNodes);
    },
    [setCurrentNodes]
  );

  const handleEdgesChange = useCallback(
    (newEdges) => {
      setCurrentEdges(newEdges);
    },
    [setCurrentEdges]
  );

  return (
    <>
      {/* Fullscreen Mode */}
      {isFullscreen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            bgcolor: "background.default",
          }}
        >
          <Playground
            ref={playgroundRef}
            nodes={currentNodes}
            edges={currentEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onInit={setRfInstance}
            height="100vh"
            showToolbar={true}
            showFullscreenButton={true}
            isFullscreen={true}
            onExitFullscreen={handleExitFullscreen}
          />
        </Box>
      )}

      {/* Normal Mode */}
      {!isFullscreen && (
        <Box
          sx={{
            transition: "margin-left 0.3s ease",
            left: DRAWER_WIDTH,
            position: "absolute",
            width: `calc(100vw - ${DRAWER_WIDTH}px)`,
            height: "100vh",
            bgcolor: "background.default",
            overflow: "hidden",
          }}
        >
          {/* Pipeline Navigation Bar */}
          <PipelineNavBar
            onBackClick={handleBackClick}
            pipelineName={`Pipeline ${
              pipelineId ? pipelineId.toLowerCase() : "undefined"
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
            onFullscreenClick={handleEnterFullscreen}
            onRunBook={() => setRunBookOpen((state) => !state)}
            onExportJSON={handleExportJSON}
            pipelineId={pipelineId}
            userAvatar="https://i.pravatar.cc/40"
          />

          {/* Playground - Visual Node Editor */}
          <Playground
            ref={playgroundRef}
            nodes={currentNodes}
            edges={currentEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onInit={setRfInstance}
            height="calc(100vh - 48px)"
            showToolbar={true}
            showFullscreenButton={false}
          />
        </Box>
      )}

      <RunBook open={isRunBookOpen} onClose={() => setRunBookOpen(false)} />

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
