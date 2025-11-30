import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BarChartIcon from "@mui/icons-material/BarChart";
import PercentIcon from "@mui/icons-material/Percent";

// Mock data for KPI cards
export const kpiData = [
  {
    id: 1,
    title: "Pipeline Running",
    value: "35",
    description: "Total number of pipeline running",
    icon: ContentCopyIcon,
    iconClass: "blue",
  },
  {
    id: 2,
    title: "MTTR",
    value: "32 min",
    description: "Average Time",
    icon: AutoAwesomeIcon,
    iconClass: "purple",
  },
  {
    id: 3,
    title: "Alerts",
    value: "07",
    description: "No. of alerts today",
    icon: BarChartIcon,
    iconClass: "green",
    cardClass: "alerts",
  },
  {
    id: 4,
    title: "SLA Compliance",
    value: "92.4%",
    description: "SLA Compliance Insights",
    icon: PercentIcon,
    iconClass: "blue",
  },
];

// Mock data for alerts chart
export const alertsChartData = [
  { workflow: "Workflow A", warning: 25, critical: 5, low: 15 },
  { workflow: "Workflow B", warning: 20, critical: 8, low: 18 },
  { workflow: "Workflow C", warning: 28, critical: 6, low: 12 },
  { workflow: "Workflow D", warning: 22, critical: 10, low: 20 },
  { workflow: "Workflow E", warning: 18, critical: 4, low: 25 },
  { workflow: "Workflow F", warning: 30, critical: 7, low: 16 },
  { workflow: "Workflow G", warning: 24, critical: 9, low: 22 },
  { workflow: "Workflow H", warning: 26, critical: 5, low: 19 },
];

// Mock data for pipeline stats
export const pipelineStatsData = {
  successful: 18,
  errors: 10,
  warning: 7,
};

// Mock data for MTTR chart
export const mttrChartData = {
  labels: ["10:00 AM", "11:30 AM", "1:00 PM", "2:15 PM", "3:40 PM", "5:45 PM", "7:35 PM", "8:30 PM"],
  datasets: [
    { color: "#4ade80", values: [8, 14, 12, 14, 20, 27, 16, 22] },
    { color: "#fb923c", values: [12, 13, 15, 16, 40, 35, 55, 35] },
    { color: "#f87171", values: [10, 12, 14, 20, 22, 27, 25, 30] },
    { color: "#c084fc", values: [11, 14, 13, 18, 38, 50, 27, 32] },
  ],
};

// Mock data for SLA Compliance chart
export const slaComplianceData = {
  overall: 98,
  stats: [
    { label: "Prediction", value: "23%", change: "6.01%", color: "#fbbf24" },
    { label: "In SLA", value: "30.1%", change: "4.12%", color: "#22c55e" },
    { label: "Out of SLA", value: "22.1%", change: "3.91%", color: "#ef4444" },
  ],
  donutSegments: [
    { percent: 22.1, color: "#ef4444" },
    { percent: 23, color: "#fbbf24" },
    { percent: 30.1, color: "#22c55e" },
  ],
};

// Mock data for workflows
export const workflowsData = [
  {
    id: 1,
    name: "Workflow A",
    members: [1, 2, 3],
    lastActivity: "28 Nov 2025, 11:20 AM",
    state: "Done",
  },
  {
    id: 2,
    name: "Workflow B",
    members: [1, 2, 3, 4, 5],
    lastActivity: "28 Nov 2025, 08:40 AM",
    state: "Overdue",
  },
  {
    id: 3,
    name: "Workflow C",
    members: [1, 2, 3],
    lastActivity: "27 Nov 2025, 4:02 PM",
    state: "Done",
  },
  {
    id: 4,
    name: "Workflow D",
    members: [1, 2],
    lastActivity: "18 Nov 2025, 5:00 PM",
    state: "Overdue",
  },
];

// Mock data for members
export const membersData = [
  {
    id: 1,
    name: "Prashant Kashyap",
    code: "DEV -101",
    access: "Admin",
    envAccess: "Prod, Stagin, Dev",
    assignedPipelines: 12,
    status: "Active",
  },
  {
    id: 2,
    name: "Mansi Yadav",
    code: "DEV -204",
    access: "Developer",
    envAccess: "Stating , Dev",
    assignedPipelines: 7,
    status: "Active",
  },
  {
    id: 3,
    name: "Niya",
    code: "DEV -333",
    access: "QA Tester",
    envAccess: "Dev",
    assignedPipelines: 3,
    status: "Active",
  },
  {
    id: 4,
    name: "Ravi Bhusahan",
    code: "DEV -33",
    access: "Viewer",
    envAccess: "Dev",
    assignedPipelines: 0,
    status: "Suspended",
  },
];

