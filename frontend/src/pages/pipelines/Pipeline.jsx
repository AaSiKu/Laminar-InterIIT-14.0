import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ButtonGroup,
} from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import KeyIcon from "@mui/icons-material/Key";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import "../../css/pipeline.css";
import Group29Svg from "../../assets/Group 29.svg";

// Mock data for run history table
const runHistoryData = [
  { id: 1, runId: "Nepal", totalUser: "84,694", vsLastWeek: 2.90, newUser: "9,536" },
  { id: 2, runId: "India", totalUser: "30,612", vsLastWeek: -4.31, newUser: "7,700" },
  { id: 3, runId: "Australia", totalUser: "22,112", vsLastWeek: 0.05, newUser: "2,778" },
  { id: 4, runId: "USA", totalUser: "9,928", vsLastWeek: 11.31, newUser: "2,272" },
];

// Mock data for logs
const logsData = [
  { id: 1, description: "Update your password regularly to enhance account security. Ensure your new password is strong and unique.", time: "9:30 PM" },
  { id: 2, description: "Update your password regularly to enhance account security. Ensure your new password is strong and unique.", time: "9:30 PM" },
  { id: 3, description: "Update your password regularly to enhance account security. Ensure your new password is strong and unique.", time: "9:30 PM" },
];

// Mock data for human oversight
const oversightData = [
  { id: 1, title: "Approve Expense Report", badge: "Assigned to you", time: "5 min ago" },
  { id: 2, title: "Verify User Registration :", badge: "abcd@user.com", time: "23 min ago" },
  { id: 3, title: "Upcoming Scheduled Pipelines", badge: "", time: "1 hr ago" },
];

// Mock data for KPI cards
const kpiData = [
  {
    id: 1,
    title: "Average Run timing",
    subtitle: "Total profit gained",
    value: "$25,049",
    changePercent: 4.33,
    changeDirection: "up",
    comparisonText: "vs last month",
    chartType: "line",
  },
  {
    id: 2,
    title: "Queue Time (Avg)",
    subtitle: "Average income per visitors in your website",
    value: "$63.20",
    changePercent: -1.03,
    changeDirection: "down",
    comparisonText: "vs last month",
    chartType: "bar",
  },
];

export default function Pipeline() {
  const { pipelineId } = useParams();
  const navigate = useNavigate();
  const [oversightFilter, setOversightFilter] = useState("weekly");
  const [historyFilter, setHistoryFilter] = useState("weekly");

  const handleBack = () => {
    navigate('/workflows');
  };

  return (
    <div className="pipeline-container">
      {/* Top Bar */}
      <div className="pipeline-topbar">
        <div className="pipeline-topbar-left">
          <input
            type="text"
            placeholder="Search"
            className="pipeline-search-input"
          />
        </div>
        <div className="pipeline-topbar-right">
          <div className="pipeline-user-avatar">
            <img src="https://i.pravatar.cc/40" alt="User" className="pipeline-avatar-img" />
          </div>
        </div>
      </div>

      {/* Secondary Navigation Bar */}
      <div className="pipeline-secondary-nav">
        <div className="pipeline-nav-left">
          <IconButton onClick={handleBack} size="small" className="pipeline-back-btn">
            <KeyboardBackspaceIcon />
          </IconButton>
          <Typography variant="body2" className="pipeline-nav-title">
            pipeline {pipelineId ? pipelineId.toLowerCase() : 'a'}
          </Typography>
        </div>
        <div className="pipeline-nav-right">
          <IconButton size="small" className="pipeline-export-btn">
            <FileUploadOutlinedIcon />
          </IconButton>
          <div className="pipeline-avatar-dropdown">
            <div className="pipeline-avatar-icon">
              <img src="https://i.pravatar.cc/24" alt="User" />
            </div>
            <ArrowDropDownIcon sx={{ fontSize: '1.25rem', color: "#fff" }} />
          </div>
          <Button
            variant="outlined"
            size="small"
            className="pipeline-share-btn"
            endIcon={<ArrowDropDownIcon />}
          >
            Share
          </Button>
          <Button variant="outlined" size="small" className="pipeline-spinup-btn">
            Spin Up
          </Button>
          <Button variant="outlined" size="small" className="pipeline-spindown-btn">
            Spin Down
          </Button>
          <Button variant="contained" size="small" className="pipeline-run-btn">
            Run
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="pipeline-grid">
        {/* Top Row */}
        <div className="pipeline-grid-top">
          {/* Promo Card */}
          <div className="pipeline-promo-card">
            <div className="pipeline-promo-header">
              <div className="pipeline-promo-left">
                <Typography variant="h3" className="pipeline-promo-title">
                  pipeline {pipelineId ? pipelineId.toLowerCase() : 'a'}
                </Typography>
                <Button variant="contained" className="pipeline-promo-btn" startIcon={<OpenInNewIcon />}>
                  Open
                </Button>
              </div>
              <div className="pipeline-promo-stats">
                <div className="pipeline-stat">
                  <span className="pipeline-stat-label">Pipeline Success Rate:</span>
                  <span className="pipeline-stat-value success">87.4%</span>
                </div>
                <div className="pipeline-stat">
                  <span className="pipeline-stat-label">Failure Rate:</span>
                  <span className="pipeline-stat-value failure">12.6%</span>
                </div>
              </div>
            </div>
            <div className="pipeline-promo-diagram">
              <img src={Group29Svg} alt="Pipeline Diagram" />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="pipeline-kpi-section">
            {kpiData.map((kpi) => (
              <div key={kpi.id} className="pipeline-kpi-card">
                <div className="pipeline-kpi-header">
                  <div>
                    <Typography variant="subtitle1" className="pipeline-kpi-title">
                      {kpi.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.subtitle}
                    </Typography>
                  </div>
                  <IconButton size="small">
                    <MoreHorizIcon />
                  </IconButton>
                </div>
                <div className="pipeline-kpi-body">
                  <div className="pipeline-kpi-value-section">
                    <Typography variant="h4" className="pipeline-kpi-value">
                      {kpi.value}
                    </Typography>
                    <div className={`pipeline-kpi-change ${kpi.changeDirection === "up" ? "positive" : "negative"}`}>
                      <Chip
                        size="small"
                        icon={kpi.changeDirection === "up" ? <TrendingUpIcon sx={{ fontSize: '0.875rem' }} /> : <TrendingDownIcon sx={{ fontSize: '0.875rem' }} />}
                        label={`${kpi.changePercent > 0 ? "+" : ""}${kpi.changePercent}%`}
                        className={kpi.changeDirection === "up" ? "pipeline-chip-positive" : "pipeline-chip-negative"}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {kpi.comparisonText}
                      </Typography>
                    </div>
                  </div>
                  {kpi.chartType === "line" ? (
                    <div className="pipeline-kpi-chart pipeline-line-chart">
                      <svg viewBox="0 0 120 60" className="pipeline-chart-svg">
                        <path d="M0,45 Q20,35 40,40 T80,25 T120,30" fill="none" stroke="#1976d2" strokeWidth="2"/>
                        <path d="M0,45 Q20,35 40,40 T80,25 T120,30 L120,60 L0,60 Z" fill="url(#blueGradient)" opacity="0.1"/>
                        <defs>
                          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#1976d2" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  ) : (
                    <div className="pipeline-kpi-chart pipeline-bar-chart">
                      {[45, 35, 50, 40, 55, 30, 48].map((height, i) => (
                        <div key={i} className="pipeline-bar-group">
                          <div className="pipeline-bar pipeline-bar-primary" style={{ height: `${height}%` }} />
                          <div className="pipeline-bar pipeline-bar-secondary" style={{ height: `${height * 0.7}%` }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Logs Section */}
          <div className="pipeline-logs-section">
            <div className="pipeline-logs-header">
              <ShieldOutlinedIcon className="pipeline-logs-icon" />
              <Typography variant="h6" className="pipeline-logs-title">
                Logs
              </Typography>
            </div>
            <div className="pipeline-logs-list">
              {logsData.map((log) => (
                <div key={log.id} className="pipeline-log-item">
                  <div className="pipeline-log-icon">
                    <KeyIcon sx={{ fontSize: '1.125rem' }} />
                  </div>
                  <div className="pipeline-log-content">
                    <Typography variant="body2" className="pipeline-log-description">
                      {log.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="pipeline-log-time">
                      {log.time}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pipeline-grid-bottom">
          {/* Human Oversight Section */}
          <div className="pipeline-oversight-section">
            <div className="pipeline-section-header">
              <div>
                <Typography variant="h6" className="pipeline-section-title">
                  Human Oversight
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Log history
                </Typography>
              </div>
              <ButtonGroup variant="outlined" size="small" className="pipeline-filter-btns">
                {["Weekly", "Monthly", "Yearly"].map((filter) => (
                  <Button
                    key={filter}
                    variant={oversightFilter === filter.toLowerCase() ? "contained" : "outlined"}
                    onClick={() => setOversightFilter(filter.toLowerCase())}
                  >
                    {filter}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            <div className="pipeline-oversight-list">
              {oversightData.map((item) => (
                <div key={item.id} className="pipeline-oversight-card">
                  <div className="pipeline-oversight-icon">
                    <ChevronLeftIcon />
                  </div>
                  <div className="pipeline-oversight-content">
                    <div className="pipeline-oversight-header">
                      <Typography variant="subtitle2" className="pipeline-oversight-title">
                        {item.title}
                      </Typography>
                      {item.badge && (
                        <Typography variant="caption" className="pipeline-oversight-badge">
                          {item.badge}
                        </Typography>
                      )}
                    </div>
                    <Typography variant="caption" color="text.secondary" className="pipeline-oversight-time">
                      {item.time}
                    </Typography>
                    <div className="pipeline-oversight-actions">
                      <Button size="small" className="pipeline-approve-btn">
                        Approve
                      </Button>
                      <Button size="small" className="pipeline-reject-btn">
                        Reject
                      </Button>
                    </div>
                  </div>
                  <IconButton size="small" className="pipeline-oversight-more">
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>

          {/* Run History Section */}
          <div className="pipeline-history-section">
            <div className="pipeline-section-header">
              <div>
                <Typography variant="h6" className="pipeline-section-title">
                  Run History
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Log history
                </Typography>
              </div>
              <ButtonGroup variant="outlined" size="small" className="pipeline-filter-btns">
                {["Weekly", "Monthly", "Yearly"].map((filter) => (
                  <Button
                    key={filter}
                    variant={historyFilter === filter.toLowerCase() ? "contained" : "outlined"}
                    onClick={() => setHistoryFilter(filter.toLowerCase())}
                    className={historyFilter === filter.toLowerCase() ? "pipeline-filter-active" : ""}
                  >
                    {filter}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            <TableContainer className="pipeline-history-table">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Run ID</TableCell>
                    <TableCell align="right">Total User</TableCell>
                    <TableCell align="right">vs. Last week</TableCell>
                    <TableCell align="right">New User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow className="pipeline-table-summary-row">
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="600">171,490</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label="1.52%" className="pipeline-chip-positive" icon={<TrendingUpIcon sx={{ fontSize: '0.75rem' }} />} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="600">39,166</Typography>
                    </TableCell>
                  </TableRow>
                  {runHistoryData.map((row) => (
                    <TableRow key={row.id} className="pipeline-table-row">
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.runId}</TableCell>
                      <TableCell align="right">{row.totalUser}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${row.vsLastWeek > 0 ? "" : ""}${row.vsLastWeek}%`}
                          className={row.vsLastWeek >= 0 ? "pipeline-chip-positive" : "pipeline-chip-negative"}
                          icon={row.vsLastWeek >= 0 ? <TrendingUpIcon sx={{ fontSize: '0.75rem' }} /> : <TrendingDownIcon sx={{ fontSize: '0.75rem' }} />}
                        />
                      </TableCell>
                      <TableCell align="right">{row.newUser}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <div className="pipeline-table-footer">
              <div className="pipeline-showing-info">
                <Typography variant="caption" color="text.secondary">
                  Showing <strong>5 out of 12</strong> items
                </Typography>
                <Button size="small" className="pipeline-show-all-btn">Show all</Button>
              </div>
              <div className="pipeline-pagination">
                <Button variant="text" size="small" disabled className="pipeline-prev-btn">
                  &lt;&nbsp;Previous
                </Button>
                <Button variant="text" size="small" className="pipeline-next-btn">
                  Next&nbsp;&gt;
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
