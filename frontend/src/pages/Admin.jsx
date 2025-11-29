import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BarChartIcon from "@mui/icons-material/BarChart";
import PercentIcon from "@mui/icons-material/Percent";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import "../css/admin.css";

// Mock data for KPI cards
const kpiData = [
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
const alertsChartData = [
  { workflow: "Workflow A", warning: 25, critical: 5, low: 15 },
  { workflow: "Workflow B", warning: 20, critical: 8, low: 18 },
  { workflow: "Workflow C", warning: 28, critical: 6, low: 12 },
  { workflow: "Workflow D", warning: 22, critical: 10, low: 20 },
  { workflow: "Workflow E", warning: 18, critical: 4, low: 25 },
  { workflow: "Workflow F", warning: 30, critical: 7, low: 16 },
  { workflow: "Workflow G", warning: 24, critical: 9, low: 22 },
  { workflow: "Workflow H", warning: 26, critical: 5, low: 19 },
];

// Mock data for workflows
const workflowsData = [
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
const membersData = [
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

// KPI Card Component
function KpiCard({ title, value, description, icon: Icon, iconClass, cardClass }) {
  return (
    <div className={`admin-kpi-card ${cardClass || ""}`}>
      <div className="admin-kpi-header">
        <Typography className="admin-kpi-title">{title}</Typography>
        <div className={`admin-kpi-icon ${iconClass}`}>
          <Icon sx={{ fontSize: "1.25rem" }} />
        </div>
      </div>
      <Typography className="admin-kpi-value">{value}</Typography>
      <Typography className="admin-kpi-description">{description}</Typography>
    </div>
  );
}

// Avatar Stack Component
function AvatarStack({ count }) {
  const displayCount = Math.min(count, 3);
  const extraCount = count > 3 ? count - 3 : 0;

  return (
    <div className="admin-avatar-stack">
      {Array.from({ length: displayCount }).map((_, i) => (
        <div key={i} className="admin-avatar-stack-item">
          <img src={`https://i.pravatar.cc/40?img=${i + 10}`} alt="Member" />
        </div>
      ))}
      {extraCount > 0 && (
        <div className="admin-avatar-stack-more">+{extraCount}</div>
      )}
    </div>
  );
}

// Status Chip Component
function StatusChip({ status }) {
  const isDone = status === "Done";
  const isActive = status === "Active";
  const chipClass = isDone || isActive ? "done" : status.toLowerCase();

  return (
    <span className={`admin-status-chip ${chipClass}`}>
      {(isDone || isActive) ? (
        <CheckCircleIcon className="admin-status-icon" />
      ) : (
        <WarningIcon className="admin-status-icon" />
      )}
      {status}
    </span>
  );
}

// Alerts Chart Component
function AlertsChart({ data }) {
  const maxValue = 40;
  const barHeight = 10; // rem

  return (
    <div className="admin-alerts-section">
      <div className="admin-alerts-header">
        <Typography className="admin-alerts-title">Alerts</Typography>
        <div className="admin-alerts-toggle">
          <IconButton className="admin-toggle-btn active" size="small">
            <AutoAwesomeIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton className="admin-toggle-btn" size="small">
            <ViewListIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </div>
      </div>
      <div className="admin-alerts-legend">
        <span className="admin-legend-label">Status of alerts</span>
        <span className="admin-legend-item">
          <span className="admin-legend-dot warning"></span>
          Warning
        </span>
        <span className="admin-legend-item">
          <span className="admin-legend-dot critical"></span>
          Critical
        </span>
        <span className="admin-legend-item">
          <span className="admin-legend-dot low"></span>
          Low
        </span>
      </div>
      <div className="admin-chart-wrapper">
        <div className="admin-chart-container">
          <div className="admin-chart-area">
            <div className="admin-chart-grid">
              {[35, 30, 25, 20, 15, 10].map((val) => (
                <div key={val} className="admin-grid-line"></div>
              ))}
            </div>
            <div className="admin-chart-bars">
              {data.map((item, index) => (
                <div key={index} className="admin-bar-group">
                  <div className="admin-bar-stack">
                    <div
                      className="admin-bar warning"
                      style={{ height: `${(item.warning / maxValue) * barHeight}rem` }}
                    />
                    <div
                      className="admin-bar critical"
                      style={{ height: `${(item.critical / maxValue) * barHeight}rem` }}
                    />
                    <div
                      className="admin-bar low"
                      style={{ height: `${(item.low / maxValue) * barHeight}rem` }}
                    />
                  </div>
                  <span className="admin-bar-label">{item.workflow}</span>
                </div>
              ))}
            </div>
            <div className="admin-chart-y-axis">
              {[35, 30, 25, 20, 15, 10].map((val) => (
                <span key={val} className="admin-y-label">{val}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Admin Page Component
export function AdminPage() {
  const [workflowPage, setWorkflowPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);

  return (
    <div className="admin-container">
      {/* Top Bar */}
      <div className="admin-topbar">
        <div className="admin-search-wrapper">
          <SearchIcon className="admin-search-icon" />
          <input
            type="text"
            placeholder="Search"
            className="admin-search-input"
          />
        </div>
        <div className="admin-user-avatar">
          <img src="https://i.pravatar.cc/40" alt="User" className="admin-avatar-img" />
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {/* Main Grid - KPIs and Alerts */}
        <div className="admin-grid">
          {/* Left Column - Header + KPI Cards */}
          <div className="admin-left-column">
            {/* Header */}
            <div className="admin-header">
              <Typography className="admin-title">Admin Overview</Typography>
              <Typography className="admin-subtitle">
                Select the metric to visualize it on right !
              </Typography>
            </div>
            {/* KPI Cards */}
            <div className="admin-kpi-section">
              {kpiData.map((kpi) => (
                <KpiCard
                  key={kpi.id}
                  title={kpi.title}
                  value={kpi.value}
                  description={kpi.description}
                  icon={kpi.icon}
                  iconClass={kpi.iconClass}
                  cardClass={kpi.cardClass}
                />
              ))}
            </div>
          </div>

          {/* Alerts Chart */}
          <div className="admin-alerts-wrapper">
            <AlertsChart data={alertsChartData} />
          </div>
        </div>

        {/* Bottom Section - Workflows and Members */}
        <div className="admin-bottom-section">
          {/* Workflows Table */}
          <div className="admin-workflows-section">
            <div className="admin-section-header">
              <div>
                <Typography className="admin-section-title">Workflows</Typography>
                <Typography className="admin-section-subtitle">
                  Total No. of Pipeline running 35
                </Typography>
              </div>
              <IconButton className="admin-more-btn" size="small">
                <MoreHorizIcon />
              </IconButton>
            </div>
            <TableContainer className="admin-table-container">
              <Table className="admin-table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Workflow</TableCell>
                    <TableCell>Members</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>State</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflowsData.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <span className="admin-workflow-name">{workflow.name}</span>
                      </TableCell>
                      <TableCell>
                        <AvatarStack count={workflow.members.length} />
                      </TableCell>
                      <TableCell>{workflow.lastActivity}</TableCell>
                      <TableCell>
                        <StatusChip status={workflow.state} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <div className="admin-table-footer">
              <div className="admin-showing-info">
                <span>Showing <strong>5 out of 12</strong> items</span>
                <Button className="admin-show-all-btn">Show all</Button>
              </div>
              <div className="admin-pagination-nav">
                <Button className="admin-prev-btn" disabled>
                  <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
                  Previous
                </Button>
                <Button className="admin-next-btn">
                  Next
                  <ChevronRightIcon sx={{ fontSize: "1rem" }} />
                </Button>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="admin-members-section">
            <div className="admin-section-header">
              <div>
                <Typography className="admin-section-title">Members</Typography>
                <Typography className="admin-section-subtitle">
                  Current status of all hiring pipelines
                </Typography>
              </div>
              <div className="admin-search-positions-wrapper">
                <SearchIcon className="admin-search-positions-icon" />
                <input
                  type="text"
                  placeholder="Search Positions"
                  className="admin-search-positions"
                />
              </div>
            </div>
            <TableContainer className="admin-table-container">
              <Table className="admin-table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Access</TableCell>
                    <TableCell>Env. Access</TableCell>
                    <TableCell>Assigned Pipelines</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {membersData.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="admin-member-info">
                          <div className="admin-member-avatar">
                            <img src={`https://i.pravatar.cc/40?img=${member.id + 20}`} alt={member.name} />
                          </div>
                          <div>
                            <Typography className="admin-member-name">{member.name}</Typography>
                            <Typography className="admin-member-code">{member.code}</Typography>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="admin-access-badge">{member.access}</span>
                      </TableCell>
                      <TableCell>
                        <span className="admin-env-access">{member.envAccess}</span>
                      </TableCell>
                      <TableCell>
                        <span className="admin-pipelines-count">
                          {member.assignedPipelines.toString().padStart(2, "0")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={member.status} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <MoreHorizIcon sx={{ fontSize: "1rem" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <div className="admin-table-footer">
              <div className="admin-showing-info">
                <span>Showing <strong>5 out of 12</strong> items</span>
                <Button className="admin-show-all-btn">Show all</Button>
              </div>
              <div className="admin-pagination">
                <IconButton className="admin-pagination-btn" size="small">
                  <KeyboardDoubleArrowLeftIcon sx={{ fontSize: "1rem" }} />
                </IconButton>
                <IconButton className="admin-pagination-btn" size="small">
                  <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
                </IconButton>
                <Button className="admin-pagination-btn active">1</Button>
                <Button className="admin-pagination-btn">2</Button>
                <Button className="admin-pagination-btn">3</Button>
                <IconButton className="admin-pagination-btn" size="small">
                  <ChevronRightIcon sx={{ fontSize: "1rem" }} />
                </IconButton>
                <IconButton className="admin-pagination-btn" size="small">
                  <KeyboardDoubleArrowRightIcon sx={{ fontSize: "1rem" }} />
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
