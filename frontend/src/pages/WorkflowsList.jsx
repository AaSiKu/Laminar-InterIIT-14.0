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
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("critical"); // critical or low

  const handleAddNew = () => {
    // Create a new workflow with next available letter
    const nextId = String.fromCharCode(97 + mockWorkflows.length);
    const newWorkflow = {
      id: nextId,
      name: `Workflow ${nextId.toUpperCase()}`,
      category: "General",
      location: "New",
      team: ["#3b82f6", "#8b5cf6"],
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
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedTab === 0) return matchesSearch;
    if (selectedTab === 1) return matchesSearch;
    if (selectedTab === 2) return matchesSearch && workflow.status === "Closed";
    return matchesSearch;
  });

  return (
    <Box sx={{ ...styles.mainContainer, ml: '64px', bgcolor: 'background.default' }}>
      {/* Main Content Area */}
      <Box sx={{ ...styles.mainContentArea, bgcolor: 'background.default' }}>
        {/* Main Content - Workflows List */}
        <Box sx={{ ...styles.workflowsListSection, bgcolor: 'background.paper', borderRight: { xs: "none", lg: "1px solid" }, borderBottom: { xs: "1px solid", lg: "none" }, borderColor: 'divider' }}>
          <WorkflowHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddNew={handleAddNew}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />

          {/* Scrollable Workflow Cards */}
          <Box sx={{ 
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            pt: 2,
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
  );
};

export default WorkflowsList;

