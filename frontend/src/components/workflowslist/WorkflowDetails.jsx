import {
  Box,
  Typography,
  AvatarGroup,
  Avatar,
  IconButton,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import DownloadIcon from "@mui/icons-material/Download";
import DescriptionIcon from "@mui/icons-material/Description";
import PipelinePreview from "./PipelinePreview";
import MetricCard from "./MetricCard";
import ActionRequired from "./ActionRequired";
import LogsSection from "./LogsSection";
import { useWebSocket } from "../../context/WebSocketContext";
import { useGlobalState } from "../../context/GlobalStateContext";
import { useEffect, useState, useMemo } from "react";
import { fetchPipelineDetails } from "../../utils/pipelineUtils";
import Loading from "../common/Loading";
import planeLight from "../../assets/plane_light.svg";
import planeDark from "../../assets/plane_dark.svg";

const WorkflowDetails = ({
  workflow,
  actionFilter,
  onActionFilterChange,
  logs,
}) => {
  const theme = useTheme();
  const { getAlertsForPipeline, alerts: allAlerts } = useWebSocket();
  const { notifications } = useGlobalState();
  const [workflowAlerts, setWorkflowAlerts] = useState([]);
  const [pipelineDetails, setPipelineDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  
  // Report menu state
  const [reportMenuAnchor, setReportMenuAnchor] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(null);

  // Handle report menu open
  const handleReportMenuOpen = async (event) => {
    setReportMenuAnchor(event.currentTarget);
    if (!workflow?.id) return;
    
    setLoadingReports(true);
    try {
      const workflowId = String(workflow.id || workflow._id);
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER}/agentic/${workflowId}/reports/list`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        console.error("Failed to fetch reports:", response.statusText);
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // Handle report menu close
  const handleReportMenuClose = () => {
    setReportMenuAnchor(null);
  };

  // Handle report download
  const handleDownloadReport = async (reportId) => {
    if (!workflow?.id) return;
    
    setDownloadingReport(reportId);
    try {
      const workflowId = String(workflow.id || workflow._id);
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER}/agentic/${workflowId}/reports/${reportId}/download`,
        { credentials: "include" }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to download report:", response.statusText);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
    } finally {
      setDownloadingReport(null);
      handleReportMenuClose();
    }
  };

  // Filter notifications for this pipeline based on the selected filter
  const filteredNotifications = useMemo(() => {
    if (!workflow?.id || !notifications || notifications.length === 0) {
      return [];
    }

    const workflowId = String(workflow.id || workflow._id);
    
    // Filter notifications for this pipeline
    const pipelineNotifications = notifications.filter((notification) => {
      return String(notification?.pipeline_id || "") === workflowId;
    });

    // Apply filter based on actionFilter
    switch (actionFilter) {
      case "notifications":
        return pipelineNotifications.filter((n) => n?.type !== "alert");
      
      case "pending_actions":
        return pipelineNotifications.filter((n) => {
          if (n.type !== "alert") return false;
          const actionTaken = n.alert?.action_taken;
          return (
            !actionTaken ||
            actionTaken === "" ||
            actionTaken === null ||
            actionTaken === undefined
          );
        });
      
      case "actions_taken":
        return pipelineNotifications.filter((n) => {
          if (n.type !== "alert") return false;
          const actionTaken = n.alert?.action_taken;
          return (
            actionTaken &&
            actionTaken !== "" &&
            actionTaken !== null &&
            actionTaken !== undefined
          );
        });
      
      default:
        return pipelineNotifications;
    }
  }, [workflow?.id, notifications, actionFilter]);

  // Fetch pipeline details when workflow is selected
  useEffect(() => {
    const loadPipelineDetails = async () => {
      if (!workflow?.id) {
        setPipelineDetails(null);
        return;
      }
      try {
        setLoadingDetails(true);
        setDetailsError(null);
        // Ensure workflow.id is converted to string
        const workflowId = typeof workflow.id === 'string' ? workflow.id : String(workflow.id || workflow._id || '');
        if (!workflowId || workflowId === '[object Object]') {
          throw new Error('Invalid workflow ID');
        }
        const details = await fetchPipelineDetails(workflowId);
        if (details.status === "success") {
          setPipelineDetails(details);
        }
      } catch (err) {
        setDetailsError(err.message || "Failed to load pipeline details");
      } finally {
        setLoadingDetails(false);
      }
    };

    loadPipelineDetails();
  }, [workflow?.id]);

  // Update alerts when workflow changes or WebSocket receives new data
  useEffect(() => {
    if (workflow?.id) {
      const alerts = getAlertsForPipeline(workflow.id);
      setWorkflowAlerts(alerts);
    } else {
      setWorkflowAlerts([]);
    }
  }, [allAlerts, workflow?.id, getAlertsForPipeline]);

  // Update pipeline details when alerts change via WebSocket
  useEffect(() => {
    if (pipelineDetails && workflow?.id) {
      const currentAlerts = getAlertsForPipeline(workflow.id);
      // Update alerts count if it changed
      if (currentAlerts.length !== (pipelineDetails.alerts_count || 0)) {
        setPipelineDetails((prev) => ({
          ...prev,
          alerts_count: currentAlerts.length,
          alerts: currentAlerts,
        }));
      }
    }
  }, [allAlerts.length, pipelineDetails, workflow?.id, getAlertsForPipeline]);
  // Format total running time from seconds to human readable format
  const formatRunningTime = (seconds) => {
    if (!seconds || seconds === 0) return "0 min";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Calculate %time run = (total_runtime / (date.now - create_time)) * 100
  const calculateTimeRunPercentage = () => {
    if (!workflow) return "0%";
    
    const totalRuntime = workflow.runtime || 0; // in seconds
    // Use created_at from pipeline details API (first version_created_at) if available
    const createTime =
      pipelineDetails?.created_at ||
                      workflow.created_at || 
                      workflow.user_pipeline_version?.version_created_at || 
                      workflow.last_updated;
    
    if (!createTime) return "0%";
    
    const now = new Date();
    const created = new Date(createTime);
    const timeSinceCreation = (now - created) / 1000; // Convert to seconds
    
    if (timeSinceCreation <= 0) return "0%";
    
    const percentage = (totalRuntime / timeSinceCreation) * 100;
    return `${percentage.toFixed(2)}%`;
  };

  // Get alerts count from pipeline details or WebSocket
  const getAlertsCount = () => {
    if (workflowAlerts.length > 0) {
      return workflowAlerts.length;
    }
    if (pipelineDetails?.alerts_count !== undefined) {
      return pipelineDetails.alerts_count;
    }
    return workflow?.alerts ? parseInt(workflow.alerts) || 0 : 0;
  };

  const timeRunPercentage = calculateTimeRunPercentage();
  const formattedRunningTime = formatRunningTime(
    workflow?.runtime || workflow?.avgRunningTime || 0
  );
  const alertsCount = getAlertsCount();

  // Show loading state if no workflow selected
  if (!workflow) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          pb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            margin: "auto",
          }}
        >
          <Box
            component="img"
            src={theme.palette.mode === "dark" ? planeDark : planeLight}
            alt="No data"
            sx={{ width: "8rem", height: "auto", opacity: 0.6 }}
          />
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: "0.875rem", mt: 2 }}
          >
            No Workflow Selected!
        </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        px: 3,
        overflowY: "scroll"
      }}
    >
      {/* Header Box */}
      <Box
        sx={{
          bgcolor: "background.paper",
        border: "1px solid", 
          borderColor: "divider",
        borderRadius: 0, 
        p: 2,
        mb: 0,
        mx: -3,
        mt: 0,
        borderTop: "none",
        }}
      >
        {loadingDetails && <Loading />}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {workflow?.name || "Unnamed Workflow"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Button
              variant="text"
              size="small"
              onClick={handleReportMenuOpen}
              startIcon={<FileCopyIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: "primary.main",
                bgcolor: "rgba(25, 118, 210, 0.08)",
                px: 1.5,
                py: 0.5,
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "rgba(25, 118, 210, 0.16)",
                },
              }}
            >
              Get Report
            </Button>
            <Menu
              anchorEl={reportMenuAnchor}
              open={Boolean(reportMenuAnchor)}
              onClose={handleReportMenuClose}
              PaperProps={{
                sx: {
                  maxHeight: 300,
                  minWidth: 250,
                },
              }}
            >
              {loadingReports ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading reports...
                </MenuItem>
              ) : reports.length === 0 ? (
                <MenuItem disabled>
                  <ListItemText primary="No reports available" />
                </MenuItem>
              ) : (
                reports.map((report) => (
                  <MenuItem
                    key={report.report_id}
                    onClick={() => handleDownloadReport(report.report_id)}
                    disabled={downloadingReport === report.report_id}
                  >
                    <ListItemIcon>
                      {downloadingReport === report.report_id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DescriptionIcon fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={report.report_id}
                      secondary={`${report.severity?.toUpperCase() || "Unknown"} - ${
                        report.timestamp
                          ? new Date(report.timestamp).toLocaleDateString()
                          : "N/A"
                      }`}
                    />
                    <DownloadIcon fontSize="small" sx={{ ml: 1, color: "text.secondary" }} />
                  </MenuItem>
                ))
              )}
            </Menu>
            <AvatarGroup
              max={3}
              sx={{
                "& .MuiAvatar-root": {
                  width: 32,
                  height: 32,
                  fontSize: "0.75rem",
                },
              }}
            >
              {(workflow?.team || []).map((member, index) => {
                const avatarUrl = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(
                  member.name || member.id || `user${index}`
                )}&size=32`;
                return (
                  <Avatar 
                    key={index}
                    src={avatarUrl}
                    alt={member.name}
                    sx={{ 
                      width: 32, 
                      height: 32,
                    }}
                    title={member.name}
                  />
                );
              })}
            </AvatarGroup>
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.875rem",
            lineHeight: 1.6,
          }}
        >
          {workflow?.description || "No description available"}
        </Typography>
        {pipelineDetails?.created_at && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              mt: 1,
              display: "block",
            }}
          >
            Created {new Date(pipelineDetails.created_at).toLocaleString()}
          </Typography>
        )}
      </Box>

      {/* 1x3 Grid: Pipeline, Average Running Time, Alerts Pending */}
      <Box 
        sx={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          mb: 0,
          mx: -3,
        }}
      >
        <PipelinePreview workflowId={workflow?.id || workflow?._id} />
        <MetricCard
          title="Total Running Time"
          subtitle="Pipeline Running"
          value={formattedRunningTime}
          change={timeRunPercentage}
        />
        <MetricCard
          title="Alerts Pending"
          subtitle="Real-time alerts from pipeline"
          value={String(alertsCount).padStart(2, "0")}
          change={workflow?.alertsChange || "0%"}
        />
      </Box>

      {/* Two Columns: Action Required and Logs */}
      <Box 
        sx={{ 
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          flex: 1,
          mx: -3,
        }}
      >
        <ActionRequired
          actionFilter={actionFilter}
          onFilterChange={onActionFilterChange}
          notifications={filteredNotifications}
        />
        <LogsSection workflow={workflow} />
      </Box>
    </Box>
  );
};

export default WorkflowDetails;
