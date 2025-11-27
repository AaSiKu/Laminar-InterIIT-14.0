import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  AppBar,
  Badge,
  Paper,
} from "@mui/material";
import TemplateSection from "../components/dashboard/TemplateSection";
import WorkflowsTable from "../components/dashboard/WorkflowsTable";
import NotificationsList from "../components/dashboard/NotificationsList";
import {
  fetchTemplates,
  fetchWorkflows,
  fetchNotifications,
} from "../utils/developerDashboard.api";
import { useNavigate } from "react-router-dom";

const workflowBlueprint = {};

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

  useEffect(() => {
    const loadData = async () => {
      const templateData = await fetchTemplates();
      setTemplates(templateData);

      const workflowData = await fetchWorkflows();
      setWorkflows(workflowData);

      const { items, count } = await fetchNotifications();
      setNotifications(items);
      setNotificationCount(count);
    };

    loadData();
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    event.stopPropagation?.();
    setCurrentTab(newValue);
  }, []);

  const handleSelectTemplate = (templateId) => {
    if (!templateId) return;
    const randomSuffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10);
    const projectId = `${templateId}-${randomSuffix}`;
    navigate(`/developer-dashboard/${projectId}`, {
      state: { templateId, workflowBlueprint },
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#ffffff",
        bgcolor: "background.default",
        overflowX: "hidden",
      }}
    >
      <Box
        sx={{
          maxWidth: "1400px",
          margin: "0 auto",
          py: 5,
          px: 4,
          overflowX: "hidden",
        }}
      >
        {/* Header Title */}
        <Typography
          variant="h3"
          fontWeight="700"
          sx={{
            mb: 5,
            color: "text.primary",
            letterSpacing: "-0.5px",
          }}
        >
          Developer Dashboard
        </Typography>

        {/* Template Section with Enhanced Styling */}
        <Box
          sx={{
            mb: 5,
            overflowX: "hidden",
            width: "100%",
            "& h4, & h5, & .MuiTypography-h4, & .MuiTypography-h5": {
              color: "text.primary",
              fontWeight: "700 !important",
              mb: 4,
              fontSize: "1.75rem",
            },
            "& .template-grid": {
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 3,
              width: "100%",
            },
            "& button, & .MuiButton-root, & .MuiCard-root": {
              borderRadius: "24px",
              background: "linear-gradient(145deg, #f8f9fa, #e9ecef)",
              boxShadow:
                "6px 6px 16px rgba(0, 0, 0, 0.08), -6px -6px 16px rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(0, 0, 0, 0.03)",
              transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              border: "1px solid rgba(0, 0, 0, 0.04)",
              position: "relative",
              overflow: "hidden",
              minHeight: "160px",
              width: "100%",
              "&::before": {
                content: '""',
                position: "absolute",
                top: "-50%",
                left: "-50%",
                width: "200%",
                height: "200%",
                background:
                  "linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
                transform: "rotate(45deg)",
                transition: "all 0.6s ease",
                animation: "shine 3s ease-in-out infinite",
              },
              "&:hover": {
                transform: "translateY(-10px)",
                boxShadow:
                  "10px 10px 24px rgba(0, 0, 0, 0.12), -10px -10px 24px rgba(255, 255, 255, 1), inset 0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 30px rgba(0, 0, 0, 0.08)",
                background: "linear-gradient(145deg, #ffffff, #f0f2f5)",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                "&::before": {
                  animation: "shine 1.5s ease-in-out infinite",
                },
              },
              "&:active": {
                transform: "translateY(-5px)",
                boxShadow:
                  "4px 4px 12px rgba(0, 0, 0, 0.1), -4px -4px 12px rgba(255, 255, 255, 0.95), inset 2px 2px 6px rgba(0, 0, 0, 0.08)",
              },
            },
            "@keyframes shine": {
              "0%": {
                left: "-50%",
                opacity: 0,
              },
              "50%": {
                opacity: 1,
              },
              "100%": {
                left: "150%",
                opacity: 0,
              },
            },
          }}
        >
          <TemplateSection
            templates={templates}
            onSelectTemplate={handleSelectTemplate}
          />
        </Box>

        {/* Workflows and Notifications Section */}
        <Paper
          sx={{
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(59, 130, 246, 0.08)",
            boxShadow: "0 4px 20px 0 rgba(59, 130, 246, 0.08)",
            overflow: "hidden",
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: "0 8px 32px 0 rgba(59, 130, 246, 0.12)",
            },
          }}
          onClick={() => handleSelectTemplate("46785295")}
        >
          <AppBar
            position="static"
            elevation={0}
            sx={{
              background: "transparent",
              borderBottom: "1px solid rgba(59, 130, 246, 0.08)",
            }}
          >
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                "& .MuiTab-root": {
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textTransform: "none",
                  letterSpacing: "0.3px",
                  py: 2.5,
                  transition: "all 0.3s ease",
                  color: "text.secondary",
                  "&:hover": {
                    color: "#3b82f6",
                    background: "rgba(59, 130, 246, 0.03)",
                  },
                  "&.Mui-selected": {
                    color: "#3b82f6",
                  },
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  background: "linear-gradient(90deg, #3b82f6, #3b82f6cc)",
                },
              }}
            >
              <Tab label="Workflows" />
              <Tab
                label={
                  <Badge
                    badgeContent={notificationCount}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontWeight: 700,
                        fontSize: "0.7rem",
                      },
                    }}
                  >
                    Notifications
                  </Badge>
                }
              />
            </Tabs>
          </AppBar>
          <TabPanel value={currentTab} index={0}>
            <WorkflowsTable workflows={workflows} />
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <NotificationsList notifications={notifications} />
          </TabPanel>
        </Paper>
      </Box>
    </Box>
  );
}
