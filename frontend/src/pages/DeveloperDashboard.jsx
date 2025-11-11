import { useState, useEffect, useCallback} from "react";
import { Container, Box, Typography, Tabs, Tab, AppBar, Badge, Paper, createTheme, ThemeProvider } from '@mui/material';
import TemplateSection from '../components/dashboard/TemplateSection';
import WorkflowsTable from '../components/dashboard/WorkflowsTable';
import NotificationsList from '../components/dashboard/NotificationsList';
import { fetchTemplates, fetchWorkflows, fetchNotifications } from '../utils/developerDashboard.api';
import { useNavigate } from "react-router-dom";


const workflowBlueprint = 
{
  "name": "LinkedIn Profile Maker",
  "nodes": [
    {
      "id": "1",
      "type": "input",
      "position": { "x": 250, "y": 50 },
      "node_id": "http",
      "category": "io",
      "data": {
        "ui": { "label": "Start Node", "iconUrl": "ABC" },
        "properties": [
          {
            "label": "url",
            "value": "http://localhost:8000/stream-users",
            "type": "str"
          },
          {
            "label": "method",
            "value": "GET",
            "type": "str"
          },
          { "label": "format", "value": "json", "type": "str" },
          {
            "label": "table_schema",
            "value": {
              "user_id": "str",
              "email": "str",
              "name": "str",
              "job": "str"
            },
            "type": "json"
          }
        ]
      }
    },
    {
      "id": "2",
      "type": "output",
      "position": { "x": 250, "y": 500 },
      "node_id": "jsonlines_write",
      "category": "io",
      "data": {
        "ui": { "label": "End Node", "iconUrl": "ABC" },
        "properties": [
          { "label": "filename", "value": "output.log", "type": "str" }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "sourceHandle": "out",
      "target": "2",
      "targetHandle": "in_0",
      "type": "smoothstep",
      "animated": true
    }
  ],
  "agents" : [
    {
      "name": "LinkedIn Profile Agent",
      "master_prompt" : "You are a linkedin profile agent that makes a professional LinkedIn Bio of a person with their name, email, job",
      "description": "Makes a professional LinkedIn Bio of a person who just newly created their account given their name, email, job. Only call this once and be happy with the results",
      "tools" : []
    }
  ],
  "triggers": [
    0
  ]

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

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSelectTemplate = useCallback(
    (templateId) => {
      if (!templateId) return;
      const randomSuffix =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 10);
      const projectId = `${templateId}-${randomSuffix}`;
      navigate(`/developer-dashboard/${projectId}`, {
        state: { templateId, workflowBlueprint },
      });
    },
    [navigate, workflowBlueprint]
  );

  return (
    <Box sx={{ Height: '80vh' }}>
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <TemplateSection templates={templates} onSelectTemplate={handleSelectTemplate} />

        <Paper sx={{ mt: 5 }}>
          <AppBar position="static" elevation={0}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="fullWidth"
            >
              <Tab label="Workflows" />
              <Tab 
                label={
                  <Badge badgeContent={notificationCount} color="error">
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
      </Container>
    </Box>
  );
};

export default DeveloperDashboard;
