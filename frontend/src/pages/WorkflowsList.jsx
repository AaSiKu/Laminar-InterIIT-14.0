import React, { useState } from "react";
import { Box } from "@mui/material";
import { styles } from "../styles/WorkflowsList.styles";
import { mockWorkflows, mockActionItems, mockLogs } from "../api/workflows.api";
import WorkflowHeader from "../components/workflowslist/WorkflowHeader";
import WorkflowCard from "../components/workflowslist/WorkflowCard";
import WorkflowDetails from "../components/workflowslist/WorkflowDetails";
import TopBar from "../components/TopBar";

export const WorkflowsList = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState(mockWorkflows[0]);
  const [actionFilter, setActionFilter] = useState("critical"); // critical or low
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const handleLogout = () => {
    // Add logout logic here
  };

  const handleAddNew = () => {
    // Create a new workflow with next available letter
    const nextId = String.fromCharCode(97 + mockWorkflows.length);
    const newWorkflow = {
      id: nextId,
      name: `Workflow ${nextId.toUpperCase()}`,
      category: "General",
      location: "New",
      team: [
        { name: "User A", initials: "UA", avatar: "https://i.pravatar.cc/150?img=60" },
        { name: "User B", initials: "UB", avatar: "https://i.pravatar.cc/150?img=47" },
      ],
      status: "Active",
      description: "New workflow description",
      avgRunningTime: "0 min",
      avgChange: "0%",
      alerts: "00",
      alertsChange: "0%",
    };
    mockWorkflows.push(newWorkflow);
    setSelectedWorkflow(newWorkflow);
  };

  const filteredWorkflows = mockWorkflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                         workflow.category.toLowerCase().includes(globalSearchQuery.toLowerCase());
    if (selectedTab === 0) return matchesSearch;
    if (selectedTab === 1) return matchesSearch;
    if (selectedTab === 2) return matchesSearch && workflow.status === "Closed";
    return matchesSearch;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', ml: '64px' }}>
      {/* TopBar */}
      <TopBar 
        showSearch={true}
        userAvatar="https://i.pravatar.cc/150?img=1"
        searchPlaceholder="Search workflows, projects, or users..."
        searchValue={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        onLogout={handleLogout}
      />

      <Box sx={{ ...styles.mainContainer, bgcolor: 'background.default', flex: 1, overflow: 'hidden' }}>
      {/* Main Content Area */}
      <Box sx={{ ...styles.mainContentArea, bgcolor: 'background.default' }}>
        {/* Main Content - Workflows List */}
        <Box sx={{ ...styles.workflowsListSection, bgcolor: 'background.paper', borderRight: "none", borderBottom: "none" }}>
          <WorkflowHeader
            onAddNew={handleAddNew}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />

          {/* Scrollable Workflow Cards */}
          <Box sx={{ 
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 2,
            pt: 2,
            pb: 3,
          }}>
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
    </Box>
  );
};

export default WorkflowsList;

 