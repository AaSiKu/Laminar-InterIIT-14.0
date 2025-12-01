import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  AvatarGroup,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Paper,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreHoriz as MoreHorizIcon,
  ArrowForward as ArrowForwardIcon,
  Settings as SettingsIcon,
  FilterList as FilterListIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { styles } from "../styles/WorkflowsList.styles";
import { mockWorkflows, mockActionItems, mockLogs } from "../api/workflows.api";
import NewProjectModal from "../components/NewProjectModal";
import CreateWorkflowDrawer from "../components/CreateWorkflowDrawer";

export const WorkflowsList = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState(mockWorkflows[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("critical"); // critical or low
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [createWorkflowDrawerOpen, setCreateWorkflowDrawerOpen] = useState(false);

  const handleAddNew = () => {
    setNewProjectModalOpen(true);
  };

  const handleSelectTemplate = (template) => {
    // If blank template, open the create workflow drawer
    if (template.id === "blank") {
      setNewProjectModalOpen(false);
      setCreateWorkflowDrawerOpen(true);
      return;
    }
    
    // Create a new workflow based on selected template
    const nextId = String.fromCharCode(97 + mockWorkflows.length);
    const newWorkflow = {
      id: nextId,
      name: template.name,
      category: "SLA",
      location: "New",
      team: ["#3b82f6", "#8b5cf6"],
      status: "Active",
      description: `New workflow created from ${template.name} template`,
      avgRunningTime: "0 min",
      avgChange: "0%",
      alerts: "00",
      alertsChange: "0%",
    };
    mockWorkflows.push(newWorkflow);
    setSelectedWorkflow(newWorkflow);
  };

  const handleCreateWorkflowComplete = (formData) => {
    // Create a new workflow with the form data
    const nextId = String.fromCharCode(97 + mockWorkflows.length);
    const newWorkflow = {
      id: nextId,
      name: formData.name || `Workflow ${nextId.toUpperCase()}`,
      category: "General",
      location: "New",
      team: ["#3b82f6", "#8b5cf6"],
      status: "Active",
      description: formData.description || "New workflow description",
      avgRunningTime: "0 min",
      avgChange: "0%",
      alerts: "00",
      alertsChange: "0%",
    };
    mockWorkflows.push(newWorkflow);
    setSelectedWorkflow(newWorkflow);
  };

  const filteredWorkflows = mockWorkflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedTab === 0) return matchesSearch;
    if (selectedTab === 1) return matchesSearch;
    if (selectedTab === 2) return matchesSearch && workflow.status === "Closed";
    return matchesSearch;
  });

  return (
    <Box sx={{ ...styles.mainContainer, ml: '64px' }}>
      {/* Main Content Area */}
      <Box sx={styles.mainContentArea}>
        {/* Main Content - Workflows List */}
        <Box sx={styles.workflowsListSection}>
          {/* Fixed Header Section */}
          <Box sx={{ flexShrink: 0, pb: 2, borderBottom: { xs: "1px solid #e5e7eb", lg: "none" } }}>
            {/* Header */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", fontSize: "1.125rem" }}>
              Workflows
            </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={handleAddNew}
                  sx={{
                    textTransform: "none",
                    bgcolor: "#3b82f6",
                    borderRadius: "6px",
                    px: 2,
                    py: 0.5,
                    fontWeight: 500,
                    fontSize: "0.8125rem",
                    boxShadow: "none",
                    minWidth: "auto",
                    "&:hover": { bgcolor: "#2563eb" },
                  }}
                >
                  Add new
                </Button>
              </Box>
              <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "0.8125rem", mb: 2 }}>
                Recruitment involvement across roles
              </Typography>
              
              {/* Search Bar */}
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      bgcolor: "#f9fafb",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      "& fieldset": { borderColor: "#e5e7eb" },
                      "& input": { padding: "8px 12px" },
                    },
                  }}
                />
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    "&:hover": { bgcolor: "#f3f4f6" },
                  }}
                >
                  <FilterListIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                </IconButton>
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              sx={{
                mb: 0,
                minHeight: "36px",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  color: "#6b7280",
                  minHeight: "36px",
                  py: 0.5,
                  px: 2,
                  "&.Mui-selected": { color: "#111827" },
                },
                "& .MuiTabs-indicator": { bgcolor: "#3b82f6", height: "2px" },
              }}
            >
              <Tab label="My Projects" />
              <Tab label="Recent" />
              <Tab label="Drafts" />
            </Tabs>
          </Box>

          {/* Scrollable Workflow Cards */}
          <Box sx={{ 
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            pt: 2,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'transparent',
              borderRadius: '4px',
            },
            '&:hover::-webkit-scrollbar-thumb': {
              background: '#cbd5e0',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#a0aec0',
            },
          }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filteredWorkflows.map((workflow) => (
            <Card
              key={workflow.id}
              onClick={() => setSelectedWorkflow(workflow)}
              sx={{
                cursor: "pointer",
                borderRadius: "8px",
                bgcolor: selectedWorkflow?.id === workflow.id ? "#EBF2F5" : "#F7FAFC",
                border: "none",
                boxShadow: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: selectedWorkflow?.id === workflow.id ? "#EBF2F5" : "#EBF2F5",
                },
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", mb: 0.5, color: "#111827" }}>
                      {workflow.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "0.8125rem", mb: 1.5 }}>
                      {workflow.category} · {workflow.location}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: "0.625rem", border: "2px solid white" } }}>
                        {workflow.team.map((color, index) => (
                          <Avatar key={index} sx={{ bgcolor: color, width: 24, height: 24 }} />
                        ))}
                      </AvatarGroup>
                      <Chip
                        label={workflow.status}
                        size="small"
                        sx={{
                          bgcolor: workflow.status === "Active" ? "#d1fae5" : "#e5e7eb",
                          color: workflow.status === "Active" ? "#065f46" : "#6b7280",
                          fontWeight: 500,
                          fontSize: "0.6875rem",
                          height: "22px",
                          borderRadius: "4px",
                        }}
                      />
                    </Box>
                  </Box>
                  <IconButton size="small" sx={{ color: "#9ca3af", ml: 1 }}>
                    <MoreHorizIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
            </Box>
          </Box>
        </Box>

        {/* Right Content - Workflow Details (67% of remaining space) */}
        {selectedWorkflow && (
          <Box
            sx={{
              flex: 1,
              height: { xs: "60vh", lg: "100vh" },
              bgcolor: "#ffffff",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              p: 3,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'transparent',
                borderRadius: '4px',
              },
              '&:hover::-webkit-scrollbar-thumb': {
                background: '#cbd5e0',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#a0aec0',
              },
            }}
          >
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "#111827", fontSize: "1.125rem" }}>
                {selectedWorkflow.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 32, height: 32, fontSize: "0.75rem" } }}>
                  {selectedWorkflow.team.map((color, index) => (
                    <Avatar key={index} sx={{ bgcolor: color, width: 32, height: 32 }} />
                  ))}
                </AvatarGroup>
                <IconButton size="small" sx={{ color: "#6b7280" }}>
                  <SettingsIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <IconButton size="small" sx={{ color: "#6b7280" }}>
                  <MoreHorizIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827", mb: 1, fontSize: "0.875rem" }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.6 }}>
              {selectedWorkflow.description}
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
            {/* Pipeline Preview */}
            <Box sx={{ bgcolor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", p: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>
                  Pipeline
                </Typography>
                <Button
                  variant="text"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                  onClick={() => navigate(`/workflows/${selectedWorkflow.id}`)}
                  sx={{
                    textTransform: "none",
                    color: "#3b82f6",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    minWidth: "auto",
                    p: 0,
                    "&:hover": { bgcolor: "transparent" },
                  }}
                >
                  Open
                </Button>
              </Box>
              <Paper
                onClick={() => navigate(`/workflows/${selectedWorkflow.id}`)}
                sx={{
                  height: 100,
                  bgcolor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    bgcolor: "#EAF3FD",
                  },
                }}
              >
                <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: "0.8125rem" }}>
                  Click to view pipeline
                </Typography>
              </Paper>
            </Box>

            {/* Average Running Time */}
            <Box sx={{ bgcolor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827", mb: 0.5 }}>
                Average Running Time
              </Typography>
              <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: "0.75rem", mb: 1.5 }}>
                Pipeline Running
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "#111827", mb: 0.75, fontSize: "1.75rem" }}>
                {selectedWorkflow.avgRunningTime}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: selectedWorkflow.avgChange.startsWith("+") ? "#10b981" : "#ef4444",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    bgcolor: selectedWorkflow.avgChange.startsWith("+") ? "#d1fae5" : "#fee2e2",
                    px: 0.75,
                    py: 0.25,
                    borderRadius: "4px",
                  }}
                >
                  {selectedWorkflow.avgChange}
                </Typography>
                <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                  vs last month
                </Typography>
              </Box>
            </Box>

            {/* Alerts Pending */}
            <Box sx={{ bgcolor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827", mb: 0.5 }}>
                Alerts Pending
              </Typography>
              <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: "0.75rem", mb: 1.5 }}>
                Average income per visitors in your website
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "#111827", mb: 0.75, fontSize: "1.75rem" }}>
                {selectedWorkflow.alerts}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: selectedWorkflow.alertsChange.startsWith("+") ? "#10b981" : selectedWorkflow.alertsChange.startsWith("-") ? "#ef4444" : "#9ca3af",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    bgcolor: selectedWorkflow.alertsChange.startsWith("+") ? "#d1fae5" : selectedWorkflow.alertsChange.startsWith("-") ? "#fee2e2" : "#f3f4f6",
                    px: 0.75,
                    py: 0.25,
                    borderRadius: "4px",
                  }}
                >
                  {selectedWorkflow.alertsChange}
                </Typography>
                <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                  vs last month
                </Typography>
              </Box>
            </Box>
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
            {/* Action Required */}
            <Box 
              sx={{ 
                display: "flex",
                flexDirection: "column",
                bgcolor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>
                  Action Required
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button
                  size="small"
                  onClick={() => setActionFilter("critical")}
                  sx={{
                    textTransform: "none",
                    bgcolor: actionFilter === "critical" ? "#EAF3FD" : "transparent",
                    color: actionFilter === "critical" ? "#1e40af" : "#6b7280",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    px: 1.5,
                    py: 0.5,
                    minWidth: "auto",
                    borderRadius: "6px",
                    "&:hover": {
                      bgcolor: actionFilter === "critical" ? "#EAF3FD" : "#f3f4f6",
                    },
                  }}
                >
                  Critical
                </Button>
                <Button
                  size="small"
                  onClick={() => setActionFilter("low")}
                  sx={{
                    textTransform: "none",
                    bgcolor: actionFilter === "low" ? "#EAF3FD" : "transparent",
                    color: actionFilter === "low" ? "#1e40af" : "#6b7280",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    px: 1.5,
                    py: 0.5,
                    minWidth: "auto",
                    borderRadius: "6px",
                    "&:hover": {
                      bgcolor: actionFilter === "low" ? "#EAF3FD" : "#f3f4f6",
                    },
                  }}
                >
                  Low
                </Button>
              </Box>
              <Box 
                sx={{ 
                  flex: 1, 
                  overflowY: "auto", 
                  p: 2,
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'transparent',
                    borderRadius: '3px',
                  },
                  '&:hover::-webkit-scrollbar-thumb': {
                    background: '#cbd5e0',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#a0aec0',
                  },
                }}
              >
                <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem", mb: 1.5, display: "block", textTransform: "capitalize" }}>
                  {actionFilter}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {mockActionItems.map((item, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: "#F7FAFC",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": { borderColor: "#3b82f6", bgcolor: "#EAF3FD" },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "#111827", flex: 1 }}>
                          {item.title}
                        </Typography>
                        <IconButton size="small" sx={{ ml: 1, p: 0.5 }}>
                          <MoreHorizIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
                        </IconButton>
                      </Box>
                      {item.email && (
                        <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                          {item.email}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: "0.6875rem", display: "block", mb: 1 }}>
                        {item.assignee || item.time}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.75 }}>
                        <Button 
                          size="small" 
                          sx={{ 
                            textTransform: "none", 
                            color: "#3b82f6", 
                            fontSize: "0.75rem", 
                            fontWeight: 500,
                            minWidth: "auto",
                            p: 0,
                          }}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="small" 
                          sx={{ 
                            textTransform: "none", 
                            color: "#ef4444", 
                            fontSize: "0.75rem", 
                            fontWeight: 500,
                            minWidth: "auto",
                            p: 0,
                          }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Logs */}
            <Box 
              sx={{ 
                display: "flex",
                flexDirection: "column",
                bgcolor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>
                  Logs
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <IconButton size="small" sx={{ color: "#9ca3af" }}>
                    <KeyboardArrowRightIcon sx={{ fontSize: 18, transform: "rotate(180deg)" }} />
                  </IconButton>
                  <IconButton size="small" sx={{ color: "#9ca3af" }}>
                    <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
              <Box 
                sx={{ 
                  flex: 1, 
                  overflowY: "auto", 
                  p: 2,
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'transparent',
                    borderRadius: '3px',
                  },
                  '&:hover::-webkit-scrollbar-thumb': {
                    background: '#cbd5e0',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#a0aec0',
                  },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {mockLogs.map((log, index) => (
                    <Box key={index} sx={{ display: "flex", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: "4px",
                          bgcolor: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          mt: 0.25,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.75rem" }}>🔑</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "#374151", mb: 0.5, lineHeight: 1.5 }}>
                          {log}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "#9ca3af" }}>
                          9:30 PM
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
          </Box>
        )}
      </Box>

      {/* New Project Modal */}
      <NewProjectModal
        open={newProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Create Workflow Drawer */}
      <CreateWorkflowDrawer
        open={createWorkflowDrawerOpen}
        onClose={() => setCreateWorkflowDrawerOpen(false)}
        onComplete={handleCreateWorkflowComplete}
      />
    </Box>
  );
};

export default WorkflowsList;

