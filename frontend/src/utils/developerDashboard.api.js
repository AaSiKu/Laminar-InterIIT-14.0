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
    { id: 'sales', name: 'MDTR & Throughput' },
    { id: 'proposal', name: 'Latency Check' },
    { id: 'invoice', name: 'Crash Reports' },
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
    { id: 'wf1', name: 'Pipeline A', owner: 'Team 54', lastModified: '3 mins' },
    { id: 'wf2', name: 'Pipeline B', owner: 'Jane Doe', lastModified: '1 days ago' },
    { id: 'wf3', name: 'Pipeline C', owner: 'John Smith', lastModified: '2 days ago' },
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
    { 
      id: 1, 
      message: 'Albus Dumbledore got access to pipeline A', 
      timestamp: '2hrs ago',
      type: 'info',
      status: null
    },
    { 
      id: 2, 
      message: 'Upcoming Scheduled Pipelines Pipeline D', 
      timestamp: '5 hrs ago',
      type: 'warning',
      status: 'Active'
    },
    { 
      id: 3, 
      message: 'Action Required Pipeline c', 
      timestamp: 'Due',
      type: 'error',
      status: 'Due'
    },
    { 
      id: 4, 
      message: 'Pipeline Failed Pipeline E', 
      timestamp: '8 hrs',
      type: 'error',
      status: null
    },
    { 
      id: 5, 
      message: 'Upcoming Scheduled Pipelines Pipeline D', 
      timestamp: '5 hrs ago',
      type: 'warning',
      status: 'Deactivate'
    },
    { 
      id: 6, 
      message: 'Action Required Pipeline F', 
      timestamp: 'Due',
      type: 'warning',
      status: 'Due'
    },
    { 
      id: 7, 
      message: '100% Successful Runs Pipeline A', 
      timestamp: '21 hrs',
      type: 'success',
      status: null
    },
    { 
      id: 8, 
      message: 'Caution data might breach', 
      timestamp: '24 hrs',
      type: 'warning',
      status: null
    },
    { 
      id: 9, 
      message: 'Albus Dumbledore got access to pipeline A', 
      timestamp: '25 hrs ago',
      type: 'info',
      status: null
    },
  ];

  return {
    items,
    count: items.length,
  };
};

/**
 * Fetches overview statistics data.
 * @returns {Promise<Object>} A promise that resolves to overview stats.
 */
export const fetchOverviewData = async () => {
  // Real API call placeholder:
  // const response = await fetch('/api/overview');
  // const data = await response.json();
  // return data;

  return {
    successRate: 25000,
    error: 12000,
    deactivated: 12000,
    failed: 2000,
  };
};

/**
 * Fetches KPI metrics data.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of KPI objects.
 */
export const fetchKPIData = async () => {
  // Real API call placeholder:
  // const response = await fetch('/api/kpis');
  // const data = await response.json();
  // return data;

  return [
    {
      id: 'pipeline-running',
      title: 'Pipeline Running',
      value: '30',
      subtitle: 'avg. daily logins',
      iconType: 'timeline',
      iconColor: '#3b82f6',
    },
    {
      id: 'mttr',
      title: 'MTTR (Mean Time to Recovery)',
      value: '15',
      subtitle: 'avg. daily logins',
      iconType: 'access-time',
      iconColor: '#10b981',
    },
    {
      id: 'alerts',
      title: 'Alerts Today',
      value: '7',
      subtitle: 'units in stock',
      iconType: 'error-outline',
      iconColor: '#ef4444',
    },
    {
      id: 'duration',
      title: 'Average Pipeline Duration',
      value: '13,200',
      subtitle: 'units in stock',
      iconType: 'speed',
      iconColor: '#f59e0b',
    },
  ];
};
