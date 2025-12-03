import { useState, useEffect } from "react";
import {
  Typography,
  IconButton,
  Drawer,
  Fab,
  Grid,
  Box,
  Divider,
} from "@mui/material";
import OverviewSection from "../components/overview/OverviewSection";
import KPICard from "../components/overview/KPICardDashboard";
import RecentWorkflowCard from "../components/overview/RecentWorkflowCard";
import HighlightsPanel from "../components/overview/HighlightsPanel";
import TopBar from "../components/common/TopBar";
import {useGlobalContext} from "../context/GlobalContext"
import {
  fetchWorkflows,
  fetchNotifications,
  fetchOverviewData,
  fetchPreviousNotifcations
} from "../utils/developerDashboard.api";
import { useNavigate } from "react-router-dom";
import "../css/overview.css";
import TimelineIcon from "@mui/icons-material/Timeline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SpeedIcon from "@mui/icons-material/Speed";
import HighlightIcon from "@mui/icons-material/Highlight";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import NoDataImage from "../assets/noData.svg";
// Icon mapping utility
const getIconComponent = (iconType) => {
  const iconMap = {
    timeline: TimelineIcon,
    "access-time": AccessTimeIcon,
    "error-outline": ErrorOutlineIcon,
    speed: SpeedIcon,
    notifications: NotificationsActiveOutlinedIcon,
  };
  return iconMap[iconType] || TimelineIcon;
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const [overviewData, setOverviewData] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const {notifications, setNotifications,workflows,setWorkflows} = useGlobalContext();

  useEffect(() => {
    const loadData = async () => {
      const workflowData = await fetchWorkflows();
      setWorkflows(workflowData.data);

      const overview = await fetchOverviewData();
      setOverviewData(overview);

      setNotifications(await fetchPreviousNotifcations())
    };
    loadData();
  }, []);

  const handleSelectTemplate = (templateId) => {
    if (!templateId) return;
    navigate(`/workflows/${templateId}`);
  };
  console.log();
  return(
    <>
      <div className="below-sidebar-container">
        <div className="overview-main">
          <TopBar userAvatar="https://i.pravatar.cc/40" />

        <div className="overview-content-wrapper">
          <div className="overview-left-content">
            <Box sx={{ 
              mx: { xs: '-16px', md: '-32px' },
              mt: { xs: '-16px', md: '-32px' },
              width: { xs: 'calc(100% + 32px)', md: 'calc(100% + 64px)' },
            }}>
              {overviewData && <Grid container spacing={0}>
                <Grid 
                className="First"
                size={{ xs: 12, md: 6, xl: 7 }}>
                  {overviewData["pie_chart"] && <OverviewSection data={overviewData["pie_chart"]} kpiData={overviewData["kpi"]} />}
                </Grid>
                


                <Grid container size={{ xs: 12, md: 6, xl: 5 }} spacing={0}>
                  {overviewData["kpi"] &&
                    overviewData["kpi"].map((kpi, index) => {
                      // Use notifications icon for the fourth card (index 3)
                      const IconComponent =
                        index === 3
                          ? getIconComponent("notifications")
                          : getIconComponent(kpi.iconType);
                      const totalKpis = overviewData["kpi"].length;
                      const isFirstRow = index < Math.ceil(totalKpis / 2);
                      const isLastRow =
                        index >= totalKpis - Math.ceil(totalKpis / 2);
                      return (
                        <Grid
                          size={{ xs: 6, sm: 4, md: 6, xl: 6 }}
                          key={kpi.id}
                        >
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
              </Grid>
              }
              </Box>

              <div className="overview-horizontal-divider" />

              <div className="overview-workflows-section">
                <div className="overview-workflows-header">
                  <Typography variant="h6" className="overview-workflows-title">
                    Recent Workflows
                  </Typography>
                </div>
                <div className="overview-workflows-list">
                  {workflows.length === 0 ? (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: "3rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1rem",
                        width: "100%",
                      }}
                    >
                      <img
                        src={NoDataImage}
                        alt="No data"
                        style={{ width: "10rem", height: "auto", opacity: 0.7 }}
                      />
                      <Typography
                        color="text.secondary"
                        sx={{ fontSize: "0.875rem" }}
                      >
                        No recent workflows
                      </Typography>
                    </Box>
                  ) : (
                    workflows.map((workflow) => (
                      <RecentWorkflowCard
                        key={workflow._id}
                        workflow={workflow}
                        onClick={() => {
                          handleSelectTemplate(workflow._id)}}
                      />
                    ))
                  )}
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
        <HighlightsPanel/>
      </Drawer>
    </>
  );
}
