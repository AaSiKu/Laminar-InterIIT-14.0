import { useState } from "react";
import { Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

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
                  onClick={() => handleKpiClick(kpi.id)}
                  isSelected={
                    (kpi.id === 1 && selectedChart === "pipeline") ||
                    (kpi.id === 2 && selectedChart === "mttr") ||
                    (kpi.id === 3 && selectedChart === "alerts") ||
                    (kpi.id === 4 && selectedChart === "sla")
                  }
                />
              ))}
            </div>
          </div>

          {/* Chart Section */}
          <div className="admin-alerts-wrapper">
            {selectedChart === "pipeline" ? (
              <PipelineStatsChart data={pipelineStatsData} />
            ) : selectedChart === "mttr" ? (
              <MTTRChart data={mttrChartData} />
            ) : selectedChart === "sla" ? (
              <SLAComplianceChart data={slaComplianceData} />
            ) : (
              <AlertsChart data={alertsChartData} />
            )}
          </div>
        </div>

        {/* Bottom Section - Workflows and Members */}
        <div className="admin-bottom-section">
          <WorkflowsTable data={workflowsData} />
          <MembersTable data={membersData} />
        </div>
      </div>
    </div>
  );
}
