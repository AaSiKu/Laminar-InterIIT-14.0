import { useState, useEffect } from "react";
import { Container, Box, Typography, Tabs, Tab, AppBar, Badge, Paper, createTheme, ThemeProvider } from '@mui/material';
import TemplateSection from '../components/dashboard/TemplateSection';
import WorkflowsTable from '../components/dashboard/WorkflowsTable';
import NotificationsList from '../components/dashboard/NotificationsList';
import { fetchTemplates, fetchWorkflows, fetchNotifications } from '../utils/developerDashboard.api';


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

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <TemplateSection templates={templates} />

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
