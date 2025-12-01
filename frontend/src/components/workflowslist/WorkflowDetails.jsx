import { Box, Typography, AvatarGroup, Avatar, IconButton } from "@mui/material";
import { Settings as SettingsIcon, MoreHoriz as MoreHorizIcon } from "@mui/icons-material";
import PipelinePreview from "./PipelinePreview";
import MetricCard from "./MetricCard";
import ActionRequired from "./ActionRequired";
import LogsSection from "./LogsSection";

const WorkflowDetails = ({ workflow, actionFilter, onActionFilterChange, actionItems, logs }) => {
  return (
    <Box
      sx={{
        flex: 1,
        height: { xs: "60vh", lg: "100vh" },
        bgcolor: 'background.paper',
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        p: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary", fontSize: "1.125rem" }}>
            {workflow.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 32, height: 32, fontSize: "0.75rem" } }}>
              {workflow.team.map((color, index) => (
                <Avatar key={index} sx={{ bgcolor: color, width: 32, height: 32 }} />
              ))}
            </AvatarGroup>
            <IconButton size="small" sx={{ color: "text.secondary" }}>
              <SettingsIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton size="small" sx={{ color: "text.secondary" }}>
              <MoreHorizIcon sx={{ fontSize: 20 }} />
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
          gap: 2,
          mb: 3,
        }}
      >
        <PipelinePreview workflowId={workflow.id} />
        <MetricCard
          title="Average Running Time"
          subtitle="Pipeline Running"
          value={workflow.avgRunningTime}
          change={workflow.avgChange}
        />
        <MetricCard
          title="Alerts Pending"
          subtitle="Average income per visitors in your website"
          value={workflow.alerts}
          change={workflow.alertsChange}
        />
      </Box>

      {/* Two Columns: Action Required and Logs */}
      <Box 
        sx={{ 
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          flex: 1,
          overflow: "hidden",
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

