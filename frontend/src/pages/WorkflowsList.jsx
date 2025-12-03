import React, { useState } from "react";
import { Box } from "@mui/material";
import { styles } from "../styles/WorkflowsList.styles";
import {
  mockWorkflows,
  mockActionItems,
  mockLogs,
} from "../utils/workflows.api";
import WorkflowHeader from "../components/workflowslist/WorkflowHeader";
import WorkflowCard from "../components/workflowslist/WorkflowCard";
import WorkflowDetails from "../components/workflowslist/WorkflowDetails";
import TopBar from "../components/common/TopBar";
import NewProjectModal from "../components/createWorkflow/NewProjectModal"
import CreateWorkflowDrawer from "../components/createWorkflow/CreateWorkflowDrawer"

export const WorkflowsList = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState(mockWorkflows[0]);
  const [actionFilter, setActionFilter] = useState("critical"); // critical or low
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

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

    // Create a new workflow based on selected template
    const nextId = String.fromCharCode(97 + mockWorkflows.length);
    const newWorkflow = {
      id: nextId,
      name: `Workflow ${nextId.toUpperCase()}`,
      category: "General",
      location: "New",
      team: [
        {
          name: "User A",
          initials: "UA",
          avatar: "https://i.pravatar.cc/150?img=60",
        },
        {
          name: "User B",
          initials: "UB",
          avatar: "https://i.pravatar.cc/150?img=47",
        },
      ],
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

  const handleCreateWorkflowComplete = (workflowData) => {
    // Create a new workflow with the form data and canvas data
    const nextId = String.fromCharCode(97 + mockWorkflows.length);
    const newWorkflow = {
      id: nextId,
      name: workflowData.name || `Workflow ${nextId.toUpperCase()}`,
      description: workflowData.description || "New workflow description",
      category: "General",
      location: "New",
      team: [
        {
          name: "User A",
          initials: "UA",
          avatar: "https://i.pravatar.cc/150?img=60",
        },
        {
          name: "User B",
          initials: "UB",
          avatar: "https://i.pravatar.cc/150?img=47",
        },
      ],
      status: "Active",
      avgRunningTime: "0 min",
      avgChange: "0%",
      alerts: "00",
      alertsChange: "0%",
      // Store the workflow canvas data
      nodes: workflowData.nodes || [],
      edges: workflowData.edges || [],
      members: workflowData.members || "",
    };
    mockWorkflows.push(newWorkflow);
    setSelectedWorkflow(newWorkflow);

    // TODO: In production, this would call the API to save the workflow
    console.log("Created workflow with nodes/edges:", newWorkflow);
  };

  const filteredWorkflows = mockWorkflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      workflow.category.toLowerCase().includes(globalSearchQuery.toLowerCase());
    if (selectedTab === 0) return matchesSearch;
    if (selectedTab === 1) return matchesSearch;
    if (selectedTab === 2) return matchesSearch && workflow.status === "Closed";
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
