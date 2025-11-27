import { useState, useEffect } from "react";
import { Box, Typography, Drawer, IconButton, Badge, useMediaQuery, useTheme } from '@mui/material';
import OverviewSection from '../components/dashboard/OverviewSection';
import KPICard from '../components/dashboard/KPICard';
import RecentWorkflowCard from '../components/dashboard/RecentWorkflowCard';
import HighlightsPanel from '../components/dashboard/HighlightsPanel';
import { fetchWorkflows, fetchNotifications, fetchOverviewData, fetchKPIData } from '../utils/developerDashboard.api';
import { useNavigate } from "react-router-dom";
import TimelineIcon from '@mui/icons-material/Timeline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import '../css/DeveloperDashboard.css';


const workflowBlueprint = {
  "_id": {
    "$oid": "691c96f31782e00f1f655dec"
  },
  "user": "691c86dbc3697d27bf30227b",
  "path": "691c96f31782e00f1f655dec",
  "pipeline": {
    "nodes": [
      {
        "id": "n1",
        "type": "http",
        "position": {
          "x": -319.98551463446233,
          "y": 15.070012941316946
        },
        "node_id": "http",
        "category": "io",
        "data": {
          "ui": {
            "label": "Failure Stream",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "name",
              "value": "failure event stream",
              "type": "str"
            },
            {
              "label": "table_schema",
              "value": {
                "service": "str",
                "failure_timestamp": "int",
                "reference_id": "str"
              },
              "type": "json"
            },
            {
              "label": "url",
              "value": "http://host.docker.internal:5050/failures",
              "type": "str"
            },
            {
              "label": "method",
              "value": "GET",
              "type": "str"
            },
            {
              "label": "headers",
              "value": null,
              "type": "str"
            },
            {
              "label": "allow_redirects",
              "value": true,
              "type": "bool"
            },
            {
              "label": "format",
              "value": "json",
              "type": "str"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 261
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "n2",
        "type": "http",
        "position": {
          "x": -134.9555879581573,
          "y": 264.6312083636773
        },
        "node_id": "http",
        "category": "io",
        "data": {
          "ui": {
            "label": "Recovery Stream",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "name",
              "value": "recovery event stream",
              "type": "str"
            },
            {
              "label": "table_schema",
              "value": {
                "service": "str",
                "recovery_timestamp": "int",
                "reference_id": "str"
              },
              "type": "json"
            },
            {
              "label": "url",
              "value": "http://host.docker.internal:5050/recoveries",
              "type": "str"
            },
            {
              "label": "method",
              "value": "GET",
              "type": "str"
            },
            {
              "label": "headers",
              "value": null,
              "type": "str"
            },
            {
              "label": "allow_redirects",
              "value": true,
              "type": "bool"
            },
            {
              "label": "format",
              "value": "json",
              "type": "str"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 261
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "n3",
        "type": "http",
        "position": {
          "x": -187.18535247977496,
          "y": -288.88932959623105
        },
        "node_id": "http",
        "category": "io",
        "data": {
          "ui": {
            "label": "Request Stream",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "name",
              "value": "request stream",
              "type": "str"
            },
            {
              "label": "table_schema",
              "value": {
                "timestamp": "int",
                "service": "str",
                "status_code": "int"
              },
              "type": "json"
            },
            {
              "label": "url",
              "value": "http://host.docker.internal:5050/requests",
              "type": "str"
            },
            {
              "label": "method",
              "value": "GET",
              "type": "str"
            },
            {
              "label": "headers",
              "value": null,
              "type": "str"
            },
            {
              "label": "allow_redirects",
              "value": true,
              "type": "bool"
            },
            {
              "label": "format",
              "value": "json",
              "type": "str"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 261
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "n4",
        "type": "filter",
        "position": {
          "x": 205.86746644826792,
          "y": -260.6125670483149
        },
        "node_id": "filter",
        "category": "table",
        "data": {
          "ui": {
            "label": "Filter Success Requests",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "filters",
              "value": [
                {
                  "col": "status_code",
                  "op": "==",
                  "value": 200
                }
              ],
              "type": "json"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 162
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "n5",
        "type": "window_by",
        "position": {
          "x": 531.168182614147,
          "y": -150.4664008633855
        },
        "node_id": "window_by",
        "category": "temporal",
        "data": {
          "ui": {
            "label": "Tumbling Window",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "time_col",
              "value": "timestamp",
              "type": "str"
            },
            {
              "label": "instance_col",
              "value": "service",
              "type": "str"
            },
            {
              "label": "reducers",
              "value": [{
                "col": "status_code",
                "reducer": "avg",
                "new_col": "throughput"
              }],
              "type": "json"
            },
            {
              "label": "window",
              "value": {
                "duration": 5,
                "origin": null,
                "window_type": "tumbling"
              },
              "type": "json"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 209
        },
        "selected": false,
        "dragging": false
      },
      
      {
        "id": "n11",
        "type": "join",
        "position": {
          "x": 211.50644623427192,
          "y": 167.11720074960337
        },
        "node_id": "join",
        "category": "table",
        "data": {
          "ui": {
            "label": "Join Failure-Recovery",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "on",
              "value": [["reference_id", "reference_id"], ["service", "service"]],
              "type": "array"
            },
            {
              "label": "how",
              "value": "inner",
              "type": "str"
            },
            {
              "label": "left_exactly_once",
              "value": null,
              "type": "null"
            },
            {
              "label": "right_exactly_once",
              "value": null,
              "type": "null"
            }
          ]
        },
        "measured": {
          "width": 225,
          "height": 186
        },
        "selected": false
      },
      {
        "id": "n8_copy_1762890964662",
        "type": "interval_join",
        "position": {
          "x": 907.459349384836,
          "y": 100.86941031344686
        },
        "node_id": "interval_join",
        "category": "temporal",
        "data": {
          "ui": {
            "label": "Interval Join Metrics",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "on",
              "value": [[ "service","service"]],
              "type": "array"
            },
            {
              "label": "how",
              "value": "inner",
              "type": "str"
            },
            {
              "label": "left_exactly_once",
              "value": null,
              "type": "null"
            },
            {
              "label": "right_exactly_once",
              "value": null,
              "type": "null"
            },
            {
              "label": "time_col1",
              "value": "_pw_window_end",
              "type": "str"
            },
            {
              "label": "time_col2",
              "value": "recovery_timestamp",
              "type": "str"
            },
            {
              "label": "lower_bound",
              "value": "-30",
              "type": "str"
            },
            {
              "label": "upper_bound",
              "value": "30",
              "type": "str"
            }
          ]
        },
        "measured": {
          "width": 211,
          "height": 233
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "n9_copy_1762891096270",
        "type": "filter",
        "position": {
          "x": 1242.5580681406927,
          "y": 108.87252642654414
        },
        "node_id": "filter",
        "category": "table",
        "data": {
          "ui": {
            "label": "Filter Low Throughput",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "filters",
              "value": [
                {
                  "col": "throughput",
                  "op": "<",
                  "value": 300
                }
              ],
              "type": "json"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 162
        },
        "selected": false,
        "dragging": false
      },
      {
        "id": "n9_copy_1762891124543_copy_1762891296305",
        "type": "alert",
        "position": {
          "x": 1257.4552314924208,
          "y": 444.1712227925845
        },
        "node_id": "alert",
        "category": "action",
        "data": {
          "ui": {
            "label": "Performance Alert",
            "iconUrl": ""
          },
          "properties": [
            {
              "label": "tool_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "trigger_description",
              "value": "",
              "type": "str"
            },
            {
              "label": "alert_prompt",
              "value": "Performance degradation detected: Low throughput and high recovery time",
              "type": "str"
            }
          ]
        },
        "measured": {
          "width": 305,
          "height": 138
        },
        "selected": false,
        "dragging": false
      }
    ],
    "edges": [
      {
        "source": "n3",
        "sourceHandle": "out",
        "target": "n4",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n3out-n4in_0"
      },
      {
        "source": "n4",
        "sourceHandle": "out",
        "target": "n5",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n4out-n5in_0"
      },
      
      {
        "source": "n1",
        "sourceHandle": "out",
        "target": "n11",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n1out-n11in_0"
      },
      {
        "source": "n2",
        "sourceHandle": "out",
        "target": "n11",
        "targetHandle": "in_1",
        "animated": true,
        "id": "xy-edge__n2out-n11in_1"
      },
      {
        "source": "n5",
        "sourceHandle": "out",
        "target": "n8_copy_1762890964662",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n6out-n8_copy_1762890964662in_0"
      },
      {
        "source": "n11",
        "sourceHandle": "out",
        "target": "n8_copy_1762890964662",
        "targetHandle": "in_1",
        "animated": true,
        "id": "xy-edge__n11out-n8_copy_1762890964662in_1"
      },
      {
        "source": "n8_copy_1762890964662",
        "sourceHandle": "out",
        "target": "n9_copy_1762891096270",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n8_copy_1762890964662out-n9_copy_1762891096270in_0"
      },
      {
        "source": "n9_copy_1762891096270",
        "sourceHandle": "out",
        "target": "n9_copy_1762891124543_copy_1762891296305",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n9_copy_1762891096270out-n9_copy_1762891124543_copy_1762891296305in_0"
      }
    ],
    "viewport": {
      "x": 594.2671447891538,
      "y": 258.0648393826819,
      "zoom": 0.7522193405499145
    }
  },
  "container_id": "",
  "host_port": "",
  "host_ip": "",
  "status": false
}["pipeline"]

const getIconComponent = (iconType) => {
  const iconMap = {
    'timeline': TimelineIcon,
    'access-time': AccessTimeIcon,
    'error-outline': ErrorOutlineIcon,
    'speed': SpeedIcon,
  };
  return iconMap[iconType] || TimelineIcon;
};

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [workflows, setWorkflows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [kpiData, setKpiData] = useState([]);
  const [highlightsOpen, setHighlightsOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const workflowData = await fetchWorkflows();
      setWorkflows(workflowData);

      const { items } = await fetchNotifications();
      setNotifications(items);

      const overview = await fetchOverviewData();
      setOverviewData(overview);

      const kpis = await fetchKPIData();
      setKpiData(kpis);
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
      navigate(`/developer-dashboard/${projectId}`, {
        state: { templateId, workflowBlueprint },
      });
  }

  return (
    <div className="developer-dashboard-container">
      {/* Main Content Area */}
      <div className="developer-dashboard-main">
        {/* Top Bar */}
        <div className="developer-dashboard-topbar">
          <div className="developer-dashboard-topbar-left">
            <input
              type="text"
              placeholder="Search"
              className="developer-dashboard-search-input"
            />
          </div>
          <div className="developer-dashboard-topbar-right">
            {/* Notifications button for mobile */}
            {isMobile && (
              <IconButton 
                onClick={() => setHighlightsOpen(true)}
                className="developer-dashboard-notification-btn"
                aria-label="Open notifications"
              >
                <Badge badgeContent={notifications.length} color="error">
                  <NotificationsIcon className="developer-dashboard-notification-icon" />
                </Badge>
              </IconButton>
            )}
            <div className="developer-dashboard-user-avatar">
              U
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="developer-dashboard-content-wrapper">
          {/* Left Content */}
          <div className="developer-dashboard-left-content">
            {/* Section 1 & 2: Overview and KPIs Row */}
            <div className="developer-dashboard-overview-kpi-row">
              {/* Section 1: Overview Section */}
              <div className="developer-dashboard-overview-wrapper">
                {overviewData && <OverviewSection data={overviewData} />}
              </div>

              {/* Vertical Divider - Hidden on mobile */}
              <div className="developer-dashboard-vertical-divider" />

              {/* Section 2: KPI Cards Grid - Fixed 2x2 Layout */}
              <div className="developer-dashboard-kpi-grid">
                {kpiData.map((kpi) => {
                  const IconComponent = getIconComponent(kpi.iconType);
                  return (
                    <div 
                      key={kpi.id}
                      className="developer-dashboard-kpi-item"
                    >
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

            {/* Horizontal Divider */}
            <div className="developer-dashboard-horizontal-divider" />

            {/* Section 3: Recent Workflows Section */}
            <div className="developer-dashboard-workflows-section">
              <div className="developer-dashboard-workflows-header">
                <Typography variant="h6" className="developer-dashboard-workflows-title">
                  Recent Workflows
        </Typography>
                <div className="developer-dashboard-more-btn">
                  <MoreHorizIcon className="developer-dashboard-more-icon" />
                </div>
              </div>
              <div className="developer-dashboard-workflows-list">
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

          {/* Section 4: Right Highlights Panel - Desktop Only */}
          {!isMobile && (
            <div className="developer-dashboard-highlights-panel">
              <HighlightsPanel notifications={notifications} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Highlights Drawer */}
      <Drawer
        anchor="right"
        open={highlightsOpen}
        onClose={() => setHighlightsOpen(false)}
        className="developer-dashboard-drawer"
      >
        <div className="developer-dashboard-drawer-header">
          <Typography variant="h6" className="developer-dashboard-drawer-title">
            Highlights
          </Typography>
          <IconButton onClick={() => setHighlightsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <HighlightsPanel notifications={notifications} />
      </Drawer>
    </div>
  );
};

export default DeveloperDashboard;