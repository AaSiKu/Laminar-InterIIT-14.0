/**
 * This file contains mock API functions for the Developer Dashboard.
 * Each function returns hardcoded data to simulate fetching from a real backend.
 */

/**
 * Fetches a list of workflow templates.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of template objects.
 */
export const fetchTemplates = async () => {
  // Real API call placeholder:
  // const response = await fetch('/api/templates');
  // const data = await response.json();
  // return data;

  return [
    { id: 'custom', name: 'Custom Workflow' },
    { id: 'sales', name: 'Sales Quote' },
    { id: 'proposal', name: 'Project Proposal' },
    { id: 'invoice', name: 'Invoice Processing' },
  ];
};

/**
 * Fetches a list of existing workflow files.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of workflow file objects.
 */
export const fetchWorkflows = async () => {
  // Real API call placeholder:
  // const response = await fetch('/api/workflows');
  // const data = await response.json();
  // return data;

  return [
    { id: 'wf1', name: 'Main Architecture Flow', owner: 'Himanshu Sharma', lastModified: 'Oct 31, 2025' },
    { id: 'wf2', name: 'Client Onboarding Workflow', owner: 'Jane Doe', lastModified: 'Oct 28, 2025' },
  ];
};

/**
 * Fetches a list of notifications.
 * @returns {Promise<{items: Array<Object>, count: number}>} A promise that resolves to an object containing notifications and their count.
 */
export const fetchNotifications = async () => {
  // Real API call placeholder:
  // const response = await fetch('/api/notifications');
  // const data = await response.json();
  // return data;

  const items = [
    { id: 1, message: 'Your "Main Architecture Flow" was approved.', timestamp: '15 minutes ago' },
    { id: 2, message: 'User John Doe commented on "Client Onboarding".', timestamp: '2 hours ago' },
  ];

  return {
    items,
    count: items.length,
  };
};
