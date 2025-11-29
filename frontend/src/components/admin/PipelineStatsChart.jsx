import { Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningIcon from "@mui/icons-material/Warning";

export function PipelineStatsChart({ data }) {
  const maxValue = 20;
  const barHeight = 12; // rem

  return (
    <div className="admin-alerts-section">
      <div className="admin-pipeline-stats">
        <div className="admin-pipeline-stats-left">
          <Typography className="admin-pipeline-stats-label">Total number of</Typography>
          <Typography className="admin-pipeline-stats-title">Pipeline Running</Typography>
          <Typography className="admin-pipeline-stats-value">35</Typography>
          
          <div className="admin-pipeline-stats-list">
            <div className="admin-pipeline-stat-item">
              <div className="admin-pipeline-stat-icon success">
                <CheckCircleIcon sx={{ fontSize: "1.25rem" }} />
              </div>
              <Typography className="admin-pipeline-stat-number">{data.successful}</Typography>
              <Typography className="admin-pipeline-stat-text">Successful</Typography>
            </div>
            <div className="admin-pipeline-stat-item">
              <div className="admin-pipeline-stat-icon error">
                <ErrorOutlineIcon sx={{ fontSize: "1.25rem" }} />
              </div>
              <Typography className="admin-pipeline-stat-number">{data.errors}</Typography>
              <Typography className="admin-pipeline-stat-text">Errors</Typography>
            </div>
            <div className="admin-pipeline-stat-item">
              <div className="admin-pipeline-stat-icon warning">
                <WarningIcon sx={{ fontSize: "1.25rem" }} />
              </div>
              <Typography className="admin-pipeline-stat-number">{data.warning.toString().padStart(2, "0")}</Typography>
              <Typography className="admin-pipeline-stat-text">Warrning</Typography>
            </div>
          </div>
        </div>
        
        <div className="admin-pipeline-stats-right">
          <div className="admin-pipeline-bars">
            <div className="admin-pipeline-bar-group">
              <span className="admin-pipeline-bar-value">{data.successful}</span>
              <div 
                className="admin-pipeline-bar success"
                style={{ height: `${(data.successful / maxValue) * barHeight}rem` }}
              />
              <span className="admin-pipeline-bar-label">Successful</span>
            </div>
            <div className="admin-pipeline-bar-group">
              <span className="admin-pipeline-bar-value">{data.errors}</span>
              <div 
                className="admin-pipeline-bar error"
                style={{ height: `${(data.errors / maxValue) * barHeight}rem` }}
              />
              <span className="admin-pipeline-bar-label">Errors</span>
            </div>
            <div className="admin-pipeline-bar-group">
              <span className="admin-pipeline-bar-value">{data.warning.toString().padStart(2, "0")}</span>
              <div 
                className="admin-pipeline-bar warning"
                style={{ height: `${(data.warning / maxValue) * barHeight}rem` }}
              />
              <span className="admin-pipeline-bar-label">Warning</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

