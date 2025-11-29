import { useState } from "react";
import { Typography, IconButton } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ViewListIcon from "@mui/icons-material/ViewList";

export function AlertsChart({ data }) {
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "table"
  const maxValue = 40;
  const barHeight = 10; // rem

  // Transform chart data for table view
  const tableData = data.map((item) => {
    // Determine indicator color based on highest value
    const maxType = item.warning >= item.critical && item.warning >= item.low 
      ? "warning" 
      : item.critical >= item.low 
        ? "critical" 
        : "low";
    
    // Calculate test percentage (total / max possible)
    const total = item.warning + item.critical + item.low;
    const testPercent = ((total / 100) * 100).toFixed(1);
    
    // Calculate month change (random for demo, based on low value)
    const monthChange = (item.low / 10).toFixed(2);
    const monthColor = item.low > item.warning ? "green" : item.warning > 20 ? "red" : "orange";
    
    return {
      pipeline: item.workflow.replace("Workflow", "Pipeline"),
      indicator: maxType,
      test: `${testPercent}%`,
      month: `${monthChange}%`,
      monthColor,
    };
  });

  return (
    <div className="admin-alerts-section">
      <div className="admin-alerts-header">
        <Typography className="admin-alerts-title">Alerts</Typography>
        <div className="admin-alerts-toggle">
          <IconButton 
            className={`admin-toggle-btn ${viewMode === "chart" ? "active" : ""}`} 
            size="medium"
            onClick={() => setViewMode("chart")}
          >
            <AutoAwesomeIcon sx={{ fontSize: "1.5rem" }} />
          </IconButton>
          <IconButton 
            className={`admin-toggle-btn ${viewMode === "table" ? "active" : ""}`} 
            size="medium"
            onClick={() => setViewMode("table")}
          >
            <ViewListIcon sx={{ fontSize: "1.5rem" }} />
          </IconButton>
        </div>
      </div>
      <div className="admin-alerts-legend">
        <span className="admin-legend-label">Status of alerts</span>
        <span className="admin-legend-item">
          <span className="admin-legend-dot warning"></span>
          Warnning
        </span>
        <span className="admin-legend-item">
          <span className="admin-legend-dot critical" style={{ background: "#fbbf24" }}></span>
          Critical
        </span>
        <span className="admin-legend-item">
          <span className="admin-legend-dot low"></span>
          Low
        </span>
      </div>
      
      {viewMode === "chart" ? (
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
      ) : (
        <div className="admin-alerts-table-wrapper">
          <table className="admin-alerts-table">
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>TEST</th>
                <th>This month</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="admin-alerts-table-pipeline">
                      <span className={`admin-alerts-table-indicator ${row.indicator}`}></span>
                      {row.pipeline}
                    </div>
                  </td>
                  <td>{row.test}</td>
                  <td>
                    <span className={`admin-alerts-table-badge ${row.monthColor}`}>
                      {row.month}
                      <span className="admin-alerts-table-x">×</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

