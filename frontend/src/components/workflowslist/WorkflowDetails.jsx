import { Box, Typography, AvatarGroup, Avatar, IconButton, Button } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import PipelinePreview from "./PipelinePreview";
import MetricCard from "./MetricCard";
import ActionRequired from "./ActionRequired";
import LogsSection from "./LogsSection";
import { useWebSocket } from "../../context/WebSocketContext";
import { useEffect, useState } from "react";

const WorkflowDetails = ({ workflow, actionFilter, onActionFilterChange, actionItems, logs }) => {
  const { getAlertsForPipeline, alerts: allAlerts } = useWebSocket();
  const [workflowAlerts, setWorkflowAlerts] = useState([]);

  // Update alerts when workflow changes or WebSocket receives new data
  useEffect(() => {
    if (workflow?.id) {
      const alerts = getAlertsForPipeline(workflow.id);
      setWorkflowAlerts(alerts);
    }
  }, [allAlerts, workflow?.id, getAlertsForPipeline]);
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
    const totalRuntime = workflow.runtime || 0; // in seconds
    // Use created_at from pipeline details API (first version_created_at)
    const createTime = workflow.created_at || workflow.user_pipeline_version?.version_created_at || workflow.last_updated;
    
    if (!createTime) return "0%";
    
    const now = new Date();
    const created = new Date(createTime);
    const timeSinceCreation = (now - created) / 1000; // Convert to seconds
    
    if (timeSinceCreation <= 0) return "0%";
    
    const percentage = (totalRuntime / timeSinceCreation) * 100;
    return `${percentage.toFixed(2)}%`;
  };

  const timeRunPercentage = calculateTimeRunPercentage();
  const formattedRunningTime = formatRunningTime(workflow.runtime || workflow.avgRunningTime || 0);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: 'background.paper',
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        px: 3,
        pb: 3,
      }}
    >
      {/* Header Box */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        border: "1px solid", 
        borderColor: 'divider', 
        borderRadius: 0, 
        p: 2,
        mb: 0,
        mx: -3,
        mt: 0,
        borderTop: "none",
      }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary", fontSize: "1.125rem" }}>
            {workflow.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Button
              variant="text"
              size="small"
              startIcon={<FileCopyIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: 'primary.main',
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                px: 1.5,
                py: 0.5,
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "none",
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.16)',
                },
              }}
            >
              Get Report
            </Button>
            <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 32, height: 32, fontSize: "0.75rem" } }}>
              {workflow.team.map((member, index) => {
                const avatarUrl = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.name || member.id || `user${index}`)}&size=32`;
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
            <IconButton 
              size="small" 
              sx={{ 
                color: 'primary.main',
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.16)',
                },
              }}
            >
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontSize: "0.875rem" }}>
          Description
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem", lineHeight: 1.6 }}>
          {workflow.description}
        </Typography>
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
        <PipelinePreview workflowId={workflow.id} />
        <MetricCard
          title="Total Running Time"
          subtitle="Pipeline Running"
          value={formattedRunningTime}
          change={timeRunPercentage}
        />
        <MetricCard
          title="Alerts Pending"
          subtitle="Real-time alerts from pipeline"
          value={String(workflowAlerts.length).padStart(2, '0')}
          change={workflow.alertsChange}
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
          actionItems={actionItems}
        />
        <LogsSection logs={logs} />
      </Box>
    </Box>
  );
};

export default WorkflowDetails;

