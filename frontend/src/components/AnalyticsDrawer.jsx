import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Stub components for content
const LogsPanel = ({ data }) => <Box p={2}><Typography>Logs content here...</Typography><pre>{JSON.stringify(data.logs, null, 2)}</pre></Box>;
const ChartsPanel = ({ data }) => <Box p={2}><Typography>Charts content here...</Typography>{/* Add your charts */}</Box>;
const HistoryPanel = ({ data }) => <Box p={2}><Typography>History content here...</Typography></Box>;
const HumanInLoopPanel = ({ data }) => <Box p={2}><Typography>Human in the Loop content here...</Typography></Box>;


export function AnalyticsDrawer({ open, onClose, flowId }) {
  const [tab, setTab] = useState('logs');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    // Fetch analytics data when the drawer opens and we have a flowId
    if (open && flowId) {
      const fetchAnalytics = async () => {
        setLoading(true);
        try {
          // --- THIS IS WHERE YOU FETCH YOUR DATA ---
          // const res = await fetch(`http://localhost:8081/analytics/${flowId}`);
          // const data = await res.json();
          
          // Using mock data for demonstration
          const mockData = {
            id: flowId,
            logs: [
              { timestamp: '2025-11-07T12:00:00Z', level: 'info', message: 'Flow started' },
              { timestamp: '2025-11-07T12:00:01Z', level: 'error', message: 'Node "abc" failed' },
            ],
            chartsData: { /* ... */ },
            history: [ /* ... */ ],
          };
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
          setAnalyticsData(mockData);
          // ------------------------------------------

        } catch (error) {
          console.error("Failed to fetch analytics:", error);
          setAnalyticsData(null); // Clear data on error
        } finally {
          setLoading(false);
        }
      };

      fetchAnalytics();
    }
  }, [open, flowId]);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '50vw', // Make it wider than the property bar
          minWidth: 500,
          maxWidth: 800,
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Flow Analytics {flowId && `(ID: ${flowId.slice(0, 8)}...)`}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Logs" value="logs" />
          <Tab label="Charts" value="charts" />
          <Tab label="History" value="history" />
          <Tab label="Human in the Loop" value="hitl" />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && analyticsData && (
          <>
            {tab === 'logs' && <LogsPanel data={analyticsData} />}
            {tab === 'charts' && <ChartsPanel data={analyticsData} />}
            {tab === 'history' && <HistoryPanel data={analyticsData} />}
            {tab === 'hitl' && <HumanInLoopPanel data={analyticsData} />}
          </>
        )}
        
        {!loading && !analyticsData && (
           <Box p={3}><Typography>No analytics data available for this flow.</Typography></Box>
        )}
      </Box>
    </Drawer>
  );
}