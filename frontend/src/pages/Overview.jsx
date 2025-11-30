import { useState, useEffect } from "react";
import { Typography, IconButton, Drawer, Fab, Grid, Box, Divider } from "@mui/material";
import OverviewSection from "../components/dashboard/OverviewSection";
import KPICard from "../components/dashboard/KPICard";
import RecentWorkflowCard from "../components/dashboard/RecentWorkflowCard";
import HighlightsPanel from "../components/dashboard/HighlightsPanel";
import ThemeToggler from "../components/ThemeToggler";
import {
  fetchWorkflows,
  fetchNotifications,
  fetchOverviewData,
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
  const [overviewData, setOverviewData] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const workflowData = await fetchWorkflows();
      setWorkflows(workflowData);

      const overview = await fetchOverviewData();
      setOverviewData(overview);

      const ws = await fetchNotifications();
      ws.onmessage = (event) => {
        const newNotification = JSON.parse(event.data);
        setNotifications((prev) => [...prev, newNotification]);
      };
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
  console.log();
  return (
    <>
    <div className="below-sidebar-container">
      <div className="overview-main">
        <Box
          className="overview-topbar"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <div className="overview-topbar-left">
            <input
              type="text"
              placeholder="Search"
              className="overview-search-input"
            />
          </div>
          <div className="overview-topbar-right">
            <ThemeToggler type="slim" />
            <div className="overview-user-avatar">U</div>
          </div>
        </Box>

        <div className="overview-content-wrapper">
          <div className="overview-left-content">
            <Box sx={{ 
              mx: { xs: '-16px', md: '-32px' },
              mt: { xs: '-16px', md: '-32px' },
              width: { xs: 'calc(100% + 32px)', md: 'calc(100% + 64px)' },
            }}>
              {overviewData && <Grid container spacing={0}>
                <Grid size={{ xs: 12, md: 6, xl: 7 }}>
                  {overviewData["pie_chart"] && <OverviewSection data={overviewData["pie_chart"]} />}
                </Grid>

                <Grid container size={{ xs: 12, md: 6, xl: 5 }} spacing={0}>
                  {overviewData["kpi"] && overviewData["kpi"].map((kpi, index) => {
                    const IconComponent = getIconComponent(kpi.iconType);
                    const totalKpis = overviewData["kpi"].length;
                    const isFirstRow = index < Math.ceil(totalKpis / 2);
                    const isLastRow = index >= totalKpis - Math.ceil(totalKpis / 2);
                    return (
                      <Grid size={{ xs: 6, sm: 4, md: 6, xl: 4 }} key={kpi.id}>
                        <KPICard
                          title={kpi.title}
                          value={kpi.value}
                          subtitle={kpi.subtitle}
                          icon={IconComponent}
                          iconColor={kpi.iconColor}
                          isFirstRow={isFirstRow}
                          isLastRow={isLastRow}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>}
            </Box>

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
