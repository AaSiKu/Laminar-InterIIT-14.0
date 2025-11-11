import { useState, useEffect, useCallback } from "react";
import { Container, Box, Typography, Tabs, Tab, AppBar, Badge, Paper } from '@mui/material';
import TemplateSection from '../components/dashboard/TemplateSection';
import WorkflowsTable from '../components/dashboard/WorkflowsTable';
import NotificationsList from '../components/dashboard/NotificationsList';
import { fetchTemplates, fetchWorkflows, fetchNotifications } from '../utils/developerDashboard.api';
import { useNavigate } from "react-router-dom";


const workflowBlueprint = {
  "_id": {
    "$oid": "69138bfd2d5fe329d1dfe689"
  },
  "user": "69134e214669069cdfbb9bc0",
  "path": "69138bfd2d5fe329d1dfe689",
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
              "label": "col",
              "value": "status_code",
              "type": "str"
            },
            {
              "label": "op",
              "value": "==",
              "type": "str"
            },
            {
              "label": "value",
              "value": 200,
              "type": "float"
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
        "id": "n6",
        "type": "reduce",
        "position": {
          "x": 827.5881084709903,
          "y": -39.61549105882836
        },
        "node_id": "reduce",
        "category": "table",
        "data": {
          "ui": {
            "label": "Calculate Throughput",
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
              "label": "reducers",
              "value": [["status_code", "count", "throughput"]],
              "type": "array"
            },
            {
              "label": "retain_columns",
              "value": ["_pw_window_start", "_pw_window_end"],
              "type": "array"
            },
            {
              "label": "retain_instance",
              "value": true,
              "type": "bool"
            }
          ]
        },
        "measured": {
          "width": 200,
          "height": 114
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
            },
            {
              "label": "time_col1",
              "value": "",
              "type": "str"
            },
            {
              "label": "time_col2",
              "value": "",
              "type": "str"
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
        "category": "table",
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
              "value": [[ "_pw_instance","service"]],
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
              "label": "col",
              "value": "throughput",
              "type": "str"
            },
            {
              "label": "op",
              "value": "<",
              "type": "str"
            },
            {
              "label": "value",
              "value": 0.3,
              "type": "float"
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
        "source": "n5",
        "sourceHandle": "out",
        "target": "n6",
        "targetHandle": "in_0",
        "animated": true,
        "id": "xy-edge__n5out-n6in_0"
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
        "source": "n6",
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
}

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const DeveloperDashboard = () => {
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
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: '#ffffff',
      bgcolor: 'background.default',
      overflowX: 'hidden',
    }}>
      <Box sx={{ maxWidth: '1400px', margin: '0 auto', py: 5, px: 4, overflowX: 'hidden' }}>
        
        {/* Header Title */}
        <Typography 
          variant="h3" 
          fontWeight="700" 
          sx={{ 
            mb: 5,
            color: 'text.primary',
            letterSpacing: '-0.5px',
          }}
        >
          Developer Dashboard
        </Typography>

        {/* Template Section with Enhanced Styling */}
        <Box 
          sx={{ 
            mb: 5,
            overflowX: 'hidden',
            width: '100%',
            '& h4, & h5, & .MuiTypography-h4, & .MuiTypography-h5': {
              color: 'text.primary',
              fontWeight: '700 !important',
              mb: 4,
              fontSize: '1.75rem',
            },
            '& .template-grid': {
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 3,
              width: '100%',
            },
            '& button, & .MuiButton-root, & .MuiCard-root': {
              borderRadius: '24px',
              background: 'linear-gradient(145deg, #f8f9fa, #e9ecef)',
              boxShadow: '6px 6px 16px rgba(0, 0, 0, 0.08), -6px -6px 16px rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '160px',
              width: '100%',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
                transform: 'rotate(45deg)',
                transition: 'all 0.6s ease',
                animation: 'shine 3s ease-in-out infinite',
              },
              '&:hover': {
                transform: 'translateY(-10px)',
                boxShadow: '10px 10px 24px rgba(0, 0, 0, 0.12), -10px -10px 24px rgba(255, 255, 255, 1), inset 0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 30px rgba(0, 0, 0, 0.08)',
                background: 'linear-gradient(145deg, #ffffff, #f0f2f5)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                '&::before': {
                  animation: 'shine 1.5s ease-in-out infinite',
                },
              },
              '&:active': {
                transform: 'translateY(-5px)',
                boxShadow: '4px 4px 12px rgba(0, 0, 0, 0.1), -4px -4px 12px rgba(255, 255, 255, 0.95), inset 2px 2px 6px rgba(0, 0, 0, 0.08)',
              },
            },
            '@keyframes shine': {
              '0%': {
                left: '-50%',
                opacity: 0,
              },
              '50%': {
                opacity: 1,
              },
              '100%': {
                left: '150%',
                opacity: 0,
              },
            },
          }}
        >
          <TemplateSection templates={templates} onSelectTemplate={handleSelectTemplate} />
        </Box>

        {/* Workflows and Notifications Section */}
        <Paper 
          sx={{ 
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.08)',
            boxShadow: '0 4px 20px 0 rgba(59, 130, 246, 0.08)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.12)',
            }
          }}
          onClick={() => handleSelectTemplate("46785295")}
        >
          <AppBar 
            position="static" 
            elevation={0}
            sx={{
              background: 'transparent',
              borderBottom: '1px solid rgba(59, 130, 246, 0.08)',
            }}
          >
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  letterSpacing: '0.3px',
                  py: 2.5,
                  transition: 'all 0.3s ease',
                  color: 'text.secondary',
                  '&:hover': {
                    color: '#3b82f6',
                    background: 'rgba(59, 130, 246, 0.03)',
                  },
                  '&.Mui-selected': {
                    color: '#3b82f6',
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  background: 'linear-gradient(90deg, #3b82f6, #3b82f6cc)',
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
                      '& .MuiBadge-badge': {
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }
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
};

export default DeveloperDashboard;