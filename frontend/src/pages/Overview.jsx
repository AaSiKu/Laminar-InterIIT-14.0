import { useState, useEffect, useCallback } from "react";
import { Box, Typography, IconButton, Badge, Drawer } from "@mui/material";
import TemplateSection from "../components/dashboard/TemplateSection";
import WorkflowsTable from "../components/dashboard/WorkflowsTable";
import NotificationsList from "../components/dashboard/NotificationsList";
import OverviewSection from "../components/dashboard/OverviewSection";
import KPICard from "../components/dashboard/KPICard";
import RecentWorkflowCard from "../components/dashboard/RecentWorkflowCard";
import HighlightsPanel from "../components/dashboard/HighlightsPanel";
import {
  fetchWorkflows,
  fetchNotifications,
  fetchOverviewData,
  fetchKPIData,
  fetchTemplates,
} from "../utils/developerDashboard.api";
import { useNavigate } from "react-router-dom";
import "../css/overview.css";
import TimelineIcon from "@mui/icons-material/Timeline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SpeedIcon from "@mui/icons-material/Speed";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

// Move this to theme
const getIconComponent = (iconType) => {
  const iconMap = {
    timeline: TimelineIcon,
    "access-time": AccessTimeIcon,
    "error-outline": ErrorOutlineIcon,
    speed: SpeedIcon,
  };
  return iconMap[iconType] || TimelineIcon;
};

const workflowBlueprint = {};

// TODO: here is it, do i need it or its from mui/lab
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentTab, setCurrentTab] = useState(0);
  const [kpiData, setKpiData] = useState([]);
  const [overviewData, setOverviewData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const templateData = await fetchTemplates();
      setTemplates(templateData);

      const workflowData = await fetchWorkflows();
      setWorkflows(workflowData);

      const overview = await fetchOverviewData();
      setOverviewData(overview);

      const kpis = await fetchKPIData();
      console.log("here")
      setKpiData(kpis);

      // TODO: Extra may
      const ws = await fetchNotifications()
      ws.onmessage = (event) => {
      console.log("msg recd")
      const newNotif = JSON.parse(event.data);
      console.log("NEW WS NOTI:", newNotif);
      setNotifications((prev) => [...prev, newNotif])
      }
    };

    loadData();
  }, []);

  const handleSelectTemplate = (templateId) => {
    if (!templateId) return;
    const randomSuffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10);
    const projectId = `${templateId}-${randomSuffix}`;
    navigate(`/workflow/${projectId}`);
  };
  console.log()
  return (
    <div className="overview-container">
      <div className="overview-main">
        <div className="overview-topbar">
          <div className="overview-topbar-left">
            <input
              type="text"
              placeholder="Search"
              className="overview-search-input"
            />
          </div>
          <div className="overview-topbar-right">
            <div className="overview-user-avatar">U</div>
          </div>
        </div>

        <div className="overview-content-wrapper">
          <div className="overview-left-content">
            <div className="overview-overview-kpi-row">
              <div className="overview-overview-wrapper">
                {overviewData && <OverviewSection data={overviewData} />}
              </div>

              <div className="overview-vertical-divider" />

              <div className="overview-kpi-grid">
                {kpiData.map((kpi) => {
                  const IconComponent = getIconComponent(kpi.iconType);
                  return (
                    <div key={kpi.id} className="overview-kpi-item">
                      <KPICard
                        title={kpi.title}
                        value={kpi.value}
                        subtitle={kpi.subtitle}
                        icon={IconComponent}
                        iconColor={kpi.iconColor}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overview-horizontal-divider" />

            <div className="overview-workflows-section">
              <div className="overview-workflows-header">
                <Typography variant="h6" className="overview-workflows-title">
                  Recent Workflows
                </Typography>
                <div className="overview-more-btn">
                  <MoreHorizIcon className="overview-more-icon" />
                </div>
              </div>
              <div className="overview-workflows-list">
                {workflows.map((workflow) => (
                  <RecentWorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onClick={() => handleSelectTemplate(workflow.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="overview-highlights-panel">
            <HighlightsPanel notifications={notifications} />
          </div>
        </div>
      </div>
    </div>
  );
}
