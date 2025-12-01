// Workflows API - Mock data and future backend integration

// Mock workflow data
export const mockWorkflows = [
  {
    id: "a",
    name: "Workflow A",
    category: "Support",
    location: "Chicago",
    team: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
    status: "Active",
    description: "The Latency Check Pipeline tracks processing time for each job and flags delays that exceed SLA limits. It highlights sudden spikes or slowdowns, helping developers quickly identify bottlenecks.",
    avgRunningTime: "32 min",
    avgChange: "+4.33%",
    alerts: "04",
    alertsChange: "-1.03%",
  },
  {
    id: "b",
    name: "Workflow B",
    category: "Engineering",
    location: "San Francisco",
    team: ["#3b82f6", "#ec4899", "#8b5cf6", "#10b981"],
    status: "Active",
    description: "Real-time data processing pipeline for customer analytics and insights generation.",
    avgRunningTime: "18 min",
    avgChange: "-2.15%",
    alerts: "02",
    alertsChange: "+0.5%",
  },
  {
    id: "c",
    name: "Workflow C",
    category: "Design",
    location: "London",
    team: ["#10b981", "#ec4899", "#f59e0b", "#8b5cf6", "#3b82f6"],
    status: "Active",
    description: "Automated design asset processing and optimization workflow for web and mobile platforms.",
    avgRunningTime: "45 min",
    avgChange: "+1.2%",
    alerts: "07",
    alertsChange: "+2.1%",
  },
  {
    id: "d",
    name: "Workflow D",
    category: "Product",
    location: "Chicago",
    team: ["#f59e0b", "#ec4899", "#3b82f6"],
    status: "Closed",
    description: "Product feedback aggregation and analysis pipeline with sentiment tracking.",
    avgRunningTime: "25 min",
    avgChange: "-0.8%",
    alerts: "00",
    alertsChange: "0%",
  },
  {
    id: "e",
    name: "Workflow E",
    category: "Marketing",
    location: "Singapore",
    team: ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6"],
    status: "Active",
    description: "Campaign performance tracking and optimization workflow with real-time metrics.",
    avgRunningTime: "12 min",
    avgChange: "-3.5%",
    alerts: "03",
    alertsChange: "-0.2%",
  },
  {
    id: "f",
    name: "Workflow F",
    category: "Marketing",
    location: "Singapore",
    team: ["#8b5cf6", "#3b82f6", "#ec4899", "#f59e0b"],
    status: "Active",
    description: "Social media monitoring and engagement pipeline with automated response handling.",
    avgRunningTime: "8 min",
    avgChange: "+0.9%",
    alerts: "01",
    alertsChange: "0%",
  },
];

// Mock action items data
export const mockActionItems = [
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
export const mockLogs = [
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
  "Update your password regularly to enhance account security. Ensure your new password is strong and unique.",
];

// API Functions (for future backend integration)

/**
 * Fetch all workflows
 * @returns {Promise<Array>} Array of workflow objects
 */
export const fetchWorkflowsAPI = async () => {
  // TODO: Replace with actual API call
  // const response = await fetch('/api/workflows');
  // return response.json();
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockWorkflows), 100);
  });
};

/**
 * Fetch a specific workflow by ID
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<Object>} Workflow object
 */
export const fetchWorkflowByIdAPI = async (workflowId) => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/workflows/${workflowId}`);
  // return response.json();
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const workflow = mockWorkflows.find(w => w.id === workflowId);
      if (workflow) {
        resolve(workflow);
      } else {
        reject(new Error('Workflow not found'));
      }
    }, 100);
  });
};

/**
 * Create a new workflow
 * @param {Object} workflowData - The workflow data
 * @returns {Promise<Object>} Created workflow object
 */
export const createWorkflowAPI = async (workflowData) => {
  // TODO: Replace with actual API call
  // const response = await fetch('/api/workflows', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(workflowData),
  // });
  // return response.json();
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(workflowData), 100);
  });
};

/**
 * Update an existing workflow
 * @param {string} workflowId - The workflow ID
 * @param {Object} workflowData - The updated workflow data
 * @returns {Promise<Object>} Updated workflow object
 */
export const updateWorkflowAPI = async (workflowId, workflowData) => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/workflows/${workflowId}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(workflowData),
  // });
  // return response.json();
  
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id: workflowId, ...workflowData }), 100);
  });
};

/**
 * Delete a workflow
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<void>}
 */
export const deleteWorkflowAPI = async (workflowId) => {
  // TODO: Replace with actual API call
  // await fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' });
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 100);
  });
};

/**
 * Fetch action items for a workflow
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<Array>} Array of action items
 */
export const fetchActionItemsAPI = async (workflowId) => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/workflows/${workflowId}/actions`);
  // return response.json();
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockActionItems), 100);
  });
};

/**
 * Fetch logs for a workflow
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<Array>} Array of log entries
 */
export const fetchLogsAPI = async (workflowId) => {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/workflows/${workflowId}/logs`);
  // return response.json();
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockLogs), 100);
  });
};

