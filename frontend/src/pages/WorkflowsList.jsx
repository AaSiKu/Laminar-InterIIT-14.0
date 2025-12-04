import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { styles } from "../styles/WorkflowsList.styles";
import { fetchWorkflows } from "../utils/utils";
import { create_pipeline, fetchPipelineDetails } from "../utils/pipelineUtils";

// Mock action items data
const mockActionItems = [
  {
    title: "Approve Expense Report",
    assignee: "Assigned to you",
    time: "5 min ago",
    critical: true,
  },
  {
    title: "Verify User Registration",
    email: "abcd@user.com",
    time: "23 min ago",
    critical: false,
  },
  {
    title: "Upcoming Scheduled Pipelines",
    time: "1hr ago",
    critical: false,
  },
  {
    title: "Upcoming Scheduled Pipelines",
    time: "1hr ago",
    critical: false,
  },
];

// Mock logs data
const mockLogs = [
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
];
import WorkflowHeader from "../components/workflowslist/WorkflowHeader";
import WorkflowCard from "../components/workflowslist/WorkflowCard";
import WorkflowDetails from "../components/workflowslist/WorkflowDetails";
import TopBar from "../components/common/TopBar";
import NewProjectModal from "../components/createWorkflow/NewProjectModal"
import CreateWorkflowDrawer from "../components/createWorkflow/CreateWorkflowDrawer"
import { useGlobalContext } from "../context/GlobalContext";
import { useGlobalState } from "../context/GlobalStateContext";
import { useWebSocket } from "../context/WebSocketContext";

// Helper function to format time ago
const formatTimeAgo = (dateString) => {
  if (!dateString) return "N/A";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
};

// Transform backend workflow data to frontend format
const transformWorkflow = async (backendWorkflow) => {
  const pipeline = backendWorkflow.user_pipeline_version?.pipeline || {};
  const runtime = backendWorkflow.runtime || 0;
  const description = backendWorkflow.user_pipeline_version?.version_description || `Pipeline: ${backendWorkflow.name}`;
  
  // Combine owners and viewers into team
  const owners = (backendWorkflow.owners || []).map(owner => ({
    ...owner,
    name: owner.name || owner.display_name || `User ${owner.id}`, // Ensure name field exists
  }));
  const viewerIds = backendWorkflow.viewer_ids || [];
  // Create viewer objects from viewer_ids (assuming they're not already fetched)
  // If viewers are fetched separately, they would be in backendWorkflow.viewers
  const viewers = backendWorkflow.viewers || viewerIds.map(id => {
    const idStr = String(id);
    return {
      id: idStr,
      display_name: `User ${idStr}`,
      name: `User ${idStr}`, // Add name for WorkflowCard compatibility
      initials: idStr.length >= 2 ? idStr.slice(0, 2).toUpperCase() : idStr.toUpperCase(),
    };
  });
  
  // Combine owners and viewers, removing duplicates by id
  const allTeamMembers = [...owners];
  viewers.forEach(viewer => {
    if (!allTeamMembers.find(m => String(m.id) === String(viewer.id))) {
      allTeamMembers.push(viewer);
    }
  });

  // Fetch pipeline details for creation time and alerts
  let created_at = null;
  let alertsCount = 0;
  try {
    const details = await fetchPipelineDetails(backendWorkflow._id);
    if (details.status === "success") {
      created_at = details.created_at;
      alertsCount = details.alerts_count || details.alerts?.length || 0;
    }
  } catch (err) {
    console.warn(`Failed to fetch details for pipeline ${backendWorkflow._id}:`, err);
  }
  
  return {
    id: backendWorkflow._id,
    name: backendWorkflow.name || "Unnamed Workflow",
    category: description, // Show description instead of "General"
    location: formatTimeAgo(backendWorkflow.last_updated), // Show time ago instead of "Default"
    team: allTeamMembers, // Include both owners and viewers
    status: backendWorkflow.status || "Stopped", // Keep original status: Running, Stopped, or Broken
    description: description,
    avgChange: "0%", // Can be calculated from historical data if available
    alerts: String(alertsCount).padStart(2, '0'),
    alertsChange: "0%", // Can be calculated from historical data if available
    nodes: pipeline.nodes || [],
    edges: pipeline.edges || [],
    members: backendWorkflow.owner_ids?.join(", ") || "",
    last_updated: backendWorkflow.last_updated,
    runtime: runtime,
    avgRunningTime: backendWorkflow.runtime || 0,
    created_at: created_at || backendWorkflow.user_pipeline_version?.version_created_at,
    // Include user_pipeline_version for RecentWorkflowCard
    user_pipeline_version: backendWorkflow.user_pipeline_version,
    // Include original backend data for reference
    owners: owners,
    viewer_ids: viewerIds,
  };
};

export const WorkflowsList = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [actionFilter, setActionFilter] = useState("critical"); // critical or low
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { workflows, setWorkflows } = useGlobalState();
  const { alerts, getAlertsForPipeline, isConnected, ws } = useWebSocket();

  // Fetch workflows from backend on mount
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchWorkflows(0, 100); // Fetch up to 100 workflows
        if (response.status === "success" && response.data) {
          // Transform workflows (with async pipeline details fetching)
          const transformedWorkflows = await Promise.all(
            response.data.map(transformWorkflow)
          );
          setWorkflows(transformedWorkflows);
          // Set first workflow as selected if available
          if (transformedWorkflows.length > 0) {
            setSelectedWorkflow(transformedWorkflows[0]);
          }
        } else {
          setError("Failed to load workflows");
        }
      } catch (err) {
        console.error("Error fetching workflows:", err);
        setError(err.message || "Failed to load workflows");
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle WebSocket messages for workflow updates and alerts
  useEffect(() => {
    if (!ws || !isConnected) return;

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const messageType = data.message_type || data.type;

        // Handle workflow updates (status changes, runtime updates, etc.)
        if (messageType === "workflow" && data._id) {
          const workflowId = String(data._id);
          
          setWorkflows(prevWorkflows => {
            const hasChanges = prevWorkflows.some(w => {
              if (w.id === workflowId) {
                return (data.status && w.status !== data.status) ||
                       (data.runtime !== undefined && w.runtime !== data.runtime) ||
                       (data.last_updated && w.last_updated !== data.last_updated);
              }
              return false;
            });
            
            if (!hasChanges) return prevWorkflows;
            
            return prevWorkflows.map(workflow => {
              if (workflow.id === workflowId) {
                // Update workflow with new data
                return {
                  ...workflow,
                  status: data.status || workflow.status,
                  runtime: data.runtime !== undefined ? data.runtime : workflow.runtime,
                  last_updated: data.last_updated || workflow.last_updated,
                  location: formatTimeAgo(data.last_updated || workflow.last_updated),
                };
              }
              return workflow;
            });
          });

          // Update selected workflow if it's the one being updated
          setSelectedWorkflow(prev => {
            if (prev && prev.id === workflowId) {
              const hasChanges = (data.status && prev.status !== data.status) ||
                               (data.runtime !== undefined && prev.runtime !== data.runtime) ||
                               (data.last_updated && prev.last_updated !== data.last_updated);
              
              if (!hasChanges) return prev;
              
              return {
                ...prev,
                status: data.status || prev.status,
                runtime: data.runtime !== undefined ? data.runtime : prev.runtime,
                last_updated: data.last_updated || prev.last_updated,
                location: formatTimeAgo(data.last_updated || prev.last_updated),
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error handling WebSocket message in WorkflowsList:", error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isConnected]);

  // Update workflow alerts in real-time from WebSocket
  useEffect(() => {
    if (!isConnected || alerts.length === 0) return;

    setWorkflows(prevWorkflows => {
      let hasChanges = false;
      const updated = prevWorkflows.map(workflow => {
        const workflowAlerts = getAlertsForPipeline(workflow.id);
        const alertsCount = workflowAlerts.length;
        const newAlerts = String(alertsCount).padStart(2, '0');
        
        if (workflow.alerts !== newAlerts) {
          hasChanges = true;
          return {
            ...workflow,
            alerts: newAlerts,
          };
        }
        return workflow;
      });
      
      return hasChanges ? updated : prevWorkflows;
    });
  }, [alerts.length, isConnected, getAlertsForPipeline, setWorkflows]);

  // Update selected workflow alerts when alerts change
  useEffect(() => {
    if (!selectedWorkflow || !isConnected) return;
    
    const workflowAlerts = getAlertsForPipeline(selectedWorkflow.id);
    const newAlerts = String(workflowAlerts.length).padStart(2, '0');
    
    if (selectedWorkflow.alerts !== newAlerts) {
      setSelectedWorkflow(prev => ({
        ...prev,
        alerts: newAlerts,
      }));
    }
  }, [alerts.length, selectedWorkflow?.id, isConnected, getAlertsForPipeline]);

  const handleLogout = () => {
    // Add logout logic here
  };
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [createWorkflowDrawerOpen, setCreateWorkflowDrawerOpen] =
    useState(false);

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

    // For other templates, open the create workflow drawer
    // The actual template data will be handled in the drawer
    setNewProjectModalOpen(false);
    setCreateWorkflowDrawerOpen(true);
  };

  const handleCreateWorkflowComplete = async (workflowData) => {
    try {
      setLoading(true);
      // Create workflow using pipelineUtils
      let newWorkflowId = null;
      let newVersionId = null;
      
      await create_pipeline(
        workflowData.name || "New Workflow",
        (id) => { newWorkflowId = id; },
        (id) => { newVersionId = id; },
        setError,
        setLoading
      );

      // Save the pipeline data if provided
      if (newWorkflowId && newVersionId && (workflowData.nodes || workflowData.edges)) {
        const response = await fetch(
          `${import.meta.env.VITE_API_SERVER}/version/save`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workflow_id: newWorkflowId,
              current_version_id: newVersionId,
              version_description: workflowData.description || "",
              version_updated_at: new Date().toISOString(),
              pipeline: {
                nodes: workflowData.nodes || [],
                edges: workflowData.edges || [],
                viewport: workflowData.viewport || { x: 0, y: 0, zoom: 1 },
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save pipeline data");
        }
      }

      // Reload workflows to get the new one
      const workflowsResponse = await fetchWorkflows(0, 100);
      if (workflowsResponse.status === "success" && workflowsResponse.data) {
        const transformedWorkflows = await Promise.all(
          workflowsResponse.data.map(transformWorkflow)
        );
        setWorkflows(transformedWorkflows);
        // Select the newly created workflow
        if (newWorkflowId) {
          const newWorkflow = transformedWorkflows.find(w => w.id === newWorkflowId);
          if (newWorkflow) {
            setSelectedWorkflow(newWorkflow);
          }
        }
      }
    } catch (err) {
      console.error("Error creating workflow:", err);
      setError(err.message || "Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      workflow.category.toLowerCase().includes(globalSearchQuery.toLowerCase());
    
    // Filter by status based on selected tab
    if (selectedTab === 0) return matchesSearch; // All workflows
    if (selectedTab === 1) return matchesSearch && workflow.status === "Running"; // Running only
    if (selectedTab === 2) return matchesSearch && (workflow.status === "Stopped" || workflow.status === "Broken"); // Stopped/Broken
    
    return matchesSearch;
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        ml: "64px",
      }}
    >
      {/* TopBar */}
      <TopBar
        showSearch={true}
        userAvatar="https://i.pravatar.cc/150?img=1"
        searchPlaceholder="Search workflows, projects, or users..."
        searchValue={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        onLogout={handleLogout}
      />

      <Box
        sx={{
          ...styles.mainContainer,
          bgcolor: "background.default",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Main Content Area */}
        <Box
          sx={{
            ...styles.mainContentArea,
            bgcolor: "background.default",
            height: "100%",
            minHeight: 0,
          }}
        >
          {/* Main Content - Workflows List */}
          <Box
            sx={{
              width: { xs: "100%", lg: "33%" },
              minWidth: { lg: 350 },
              maxWidth: { lg: 500 },
              bgcolor: "background.paper",
              borderRight: "none",
              borderBottom: "none",
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              p: 3,
            }}
          >
            <WorkflowHeader
              onAddNew={handleAddNew}
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
            />

            {/* Scrollable Workflow Cards */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                px: 2,
                pt: 2,
                pb: 3,
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
                  <Typography color="error">{error}</Typography>
                </Box>
              ) : filteredWorkflows.length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
                  <Typography color="text.secondary">No workflows found</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {filteredWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      isSelected={selectedWorkflow?.id === workflow.id}
                      onClick={() => setSelectedWorkflow(workflow)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Right Content - Workflow Details */}
          {selectedWorkflow && (
            <WorkflowDetails
              workflow={selectedWorkflow}
              actionFilter={actionFilter}
              onActionFilterChange={setActionFilter}
              actionItems={mockActionItems}
              logs={mockLogs}
            />
          )}
        </Box>
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
