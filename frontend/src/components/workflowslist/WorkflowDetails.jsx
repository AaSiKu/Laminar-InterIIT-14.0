import { Box, Typography, AvatarGroup, Avatar, IconButton, Button } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import FileCopyIcon from '@mui/icons-material/FileCopy';
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
              {workflow.team.map((member, index) => (
                <Avatar 
                  key={index}
                  src={member.avatar}
                  alt={member.name}
                  sx={{ 
                    width: 32, 
                    height: 32,
                  }}
                  title={member.name}
                />
              ))}
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
          gap: 0,
          flex: 1,
          overflow: "hidden",
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

