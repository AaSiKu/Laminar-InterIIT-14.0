/**
 * This file contains API functions for the Admin Dashboard.
 * Each function returns data to simulate fetching from a real backend.
 */

/**
 * Fetches KPI metrics data for admin dashboard.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of KPI objects.
 */
export const fetchAdminKpiData = async () => {
  // Real API call placeholder:
  // const response = await fetch(`${import.meta.env.VITE_API_SERVER}/admin/kpis`);
  // const data = await response.json();
  // return data;

  return [
    {
      title: "Pipelines Running",
      value: "3",
      description: "Currently active pipelines",
      iconType: "pipeline",
      color: "#3b82f6",
    },
    {
      title: "Total Pipelines",
      value: "6",
      description: "Total deployed pipeline instances",
      iconType: "trending-up",
      color: "#3b82f6",
    },
    {
      title: "Average Runtime",
      value: "3.2 hrs",
      description: "Mean duration per pipeline",
      iconType: "timer",
      color: "#3b82f6",
    },
    {
      title: "Alerts Today",
      value: "5",
      description: "Total alerts generated today",
      iconType: "notifications",
      color: "#3b82f6",
    },
  ];
};

/**
 * Fetches pipeline data for admin dashboard.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of pipeline objects.
 */
export const fetchAdminPipelines = async () => {
  // Real API call placeholder:
  // const response = await fetch(`${import.meta.env.VITE_API_SERVER}/admin/pipelines`);
  // const data = await response.json();
  // return data;

  return [
    {
      id: 1,
      name: "Pipeline A",
      status: "Running",
      breachReason: "Disk I/O saturation",
      lastBreachTime: "10:30 AM",
      owner: "Team Alpha",
    },
    {
      id: 2,
      name: "Pipeline B",
      status: "Completed",
      breachReason: "-",
      lastBreachTime: "9:00 AM",
      owner: "Team Beta",
    },
    {
      id: 3,
      name: "Pipeline C",
      status: "Failed",
      breachReason: "Network timeout",
      lastBreachTime: "11:15 AM",
      owner: "Team Gamma",
    },
    {
      id: 4,
      name: "Pipeline D",
      status: "Running",
      breachReason: "Input data skew",
      lastBreachTime: "12:05 PM",
      owner: "Team Delta",
    },
    {
      id: 5,
      name: "Pipeline E",
      status: "Running",
      breachReason: "Memory pressure",
      lastBreachTime: "1:20 PM",
      owner: "Team Alpha",
    },
    {
      id: 6,
      name: "Pipeline F",
      status: "Completed",
      breachReason: "-",
      lastBreachTime: "8:45 AM",
      owner: "Team Beta",
    },
  ];
};

