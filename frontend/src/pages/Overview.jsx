import { useState, useEffect } from "react";
import { Typography, IconButton, Drawer, Fab } from "@mui/material";
import OverviewSection from "../components/dashboard/OverviewSection";
import KPICard from "../components/dashboard/KPICard";
import RecentWorkflowCard from "../components/dashboard/RecentWorkflowCard";
import HighlightsPanel from "../components/dashboard/HighlightsPanel";
import {
  fetchWorkflows,
  fetchNotifications,
  fetchOverviewData,
  fetchKPIData,
} from "../utils/developerDashboard.api";
import { useNavigate } from "react-router-dom";
import "../css/overview.css";
import TimelineIcon from "@mui/icons-material/Timeline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SpeedIcon from "@mui/icons-material/Speed";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import HighlightIcon from "@mui/icons-material/Highlight";
import CloseIcon from "@mui/icons-material/Close";

// Icon mapping utility
const getIconComponent = (iconType) => {
  const iconMap = {
    timeline: TimelineIcon,
    "access-time": AccessTimeIcon,
    "error-outline": ErrorOutlineIcon,
    speed: SpeedIcon,
  };
  return iconMap[iconType] || TimelineIcon;
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const workflowData = await fetchWorkflows();
      setWorkflows(workflowData);

      const overview = await fetchOverviewData();
      setOverviewData(overview);

      const kpis = await fetchKPIData();
      setKpiData(kpis);

      const { items } = await fetchNotifications();
      setNotifications(items);
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

  return (
    <>
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

      {/* Floating Action Button for Mobile/Tablet */}
      <Fab
        className="overview-highlights-fab"
        onClick={() => setMobileDrawerOpen(true)}
        aria-label="highlights"
      >
        <HighlightIcon />
      </Fab>

      {/* Mobile/Tablet Drawer for Highlights */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        className="overview-drawer"
      >
        <div className="overview-drawer-header">
          <Typography variant="h6" className="overview-drawer-title">
            Highlights
          </Typography>
          <IconButton onClick={() => setMobileDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <HighlightsPanel notifications={notifications} />
      </Drawer>
    </>
  );
}
