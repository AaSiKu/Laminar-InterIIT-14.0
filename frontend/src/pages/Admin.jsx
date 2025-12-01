import { useState } from "react";
import { Typography, Box, Divider } from "@mui/material";
import TopBar from "../components/TopBar";

// Import components from admin folder
import {
  KpiCard,
  PipelineStatsChart,
  MTTRChart,
  SLAComplianceChart,
  AlertsChart,
  WorkflowsTable,
  MembersTable,
  kpiData,
  alertsChartData,
  pipelineStatsData,
  mttrChartData,
  slaComplianceData,
  workflowsData,
  membersData,
} from "../components/admin";
import "../css/overview.css"
import "../css/admin.css";

// Main Admin Page Component
export function AdminPage() {
  const [selectedChart, setSelectedChart] = useState("alerts");

  const handleKpiClick = (kpiId) => {
    if (kpiId === 1) {
      setSelectedChart("pipeline");
    } else if (kpiId === 2) {
      setSelectedChart("mttr");
    } else if (kpiId === 3) {
      setSelectedChart("alerts");
    } else if (kpiId === 4) {
      setSelectedChart("sla");
    }
  };

  return (
    <Box
      className="below-sidebar-container"
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        className="admin-container"
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Bar */}
        <TopBar userAvatar="https://i.pravatar.cc/40" />

        {/* Main Content */}
        <Box
          className="admin-content"
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            overflowY: 'auto',
          }}
        >
          {/* Main Grid - KPIs and Alerts */}
          <Box
            className="admin-grid"
            sx={{
              display: 'flex',
              overflow: 'hidden',
              flexDirection: { xs: 'column', lg: 'row' },
            }}
          >
            {/* Left Column - Header + KPI Cards */}
            <Box
              className="admin-left-column"
              sx={{
                width: { xs: '100%', lg: '50%' },
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Header */}
              <Box className="admin-header" sx={{ mb: 0.5 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 0.25,
                  }}
                >
                  Admin Overview
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  Select the metric to visualize it on right !
                </Typography>
              </Box>
              {/* KPI Cards */}
              <Box
                className="admin-kpi-section"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                  flex: 1,
                }}
              >
                {kpiData.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    title={kpi.title}
                    value={kpi.value}
                    description={kpi.description}
                    icon={kpi.icon}
                    iconClass={kpi.iconClass}
                    cardClass={kpi.cardClass}
                    onClick={() => handleKpiClick(kpi.id)}
                    isSelected={
                      (kpi.id === 1 && selectedChart === "pipeline") ||
                      (kpi.id === 2 && selectedChart === "mttr") ||
                      (kpi.id === 3 && selectedChart === "alerts") ||
                      (kpi.id === 4 && selectedChart === "sla")
                    }
                  />
                ))}
              </Box>
            </Box>

            {/* Chart Section */}
            <Box
              className="admin-alerts-wrapper"
              sx={{
                width: { xs: '100%', lg: '50%' },
                p: 2.5,
              }}
            >
              {selectedChart === "pipeline" ? (
                <PipelineStatsChart data={pipelineStatsData} />
              ) : selectedChart === "mttr" ? (
                <MTTRChart data={mttrChartData} />
              ) : selectedChart === "sla" ? (
                <SLAComplianceChart data={slaComplianceData} />
              ) : (
                <AlertsChart data={alertsChartData} />
              )}
            </Box>
          </Box>

          {/* Divider between top and bottom sections */}
          <Divider sx={{ my: 3 }} />

          {/* Bottom Section - Workflows and Members */}
          <Box
            className="admin-bottom-section"
            sx={{
              display: 'flex',
              overflow: 'hidden',
              flexDirection: { xs: 'column', lg: 'row' },
            }}
          >
            <WorkflowsTable data={workflowsData} />
            <Divider 
              orientation="vertical" 
              flexItem 
              sx={{ 
                display: { xs: 'none', lg: 'block' },
                mx: 0,
              }} 
            />
            <Box
              sx={{
                display: { xs: 'block', lg: 'none' },
                width: '100%',
              }}
            >
              <Divider sx={{ my: 0 }} />
            </Box>
            <MembersTable data={membersData} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
