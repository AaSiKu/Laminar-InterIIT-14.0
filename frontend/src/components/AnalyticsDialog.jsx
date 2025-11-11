import { useState, useEffect, forwardRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Button,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// --- Stub components for content ---
const LogsPanel = ({ data }) => <Box p={2}><Typography>Logs content here...</Typography><pre>{JSON.stringify(data.logs, null, 2)}</pre></Box>;
const ChartsPanel = ({ data }) => <Box p={2}><Typography>Charts content here...</Typography>{/* Add your charts */}</Box>;
const HistoryPanel = ({ data }) => <Box p={2}><Typography>History content here...</Typography></Box>;
const HumanInLoopPanel = ({ data }) => <Box p={2}><Typography>Human in the Loop content here...</Typography></Box>;
// ---------------------------------

// Slide transition for the dialog
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function AnalyticsDialog({ open, onClose, flowId }) {
  const [tab, setTab] = useState('logs');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    // Fetch analytics data when the dialog opens and we have a flowId
    if (open && flowId) {
      const fetchAnalytics = async () => {
        setLoading(true);
        try {
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

        } catch (error) {
          console.error("Failed to fetch analytics:", error);
          setAnalyticsData(null); 
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
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      {/* This AppBar is *inside* the Dialog to provide controls */}
      <AppBar 
        position="static" 
        color="inherit" 
        elevation={1}
        sx={{ 
          borderBottom: 1, 
          borderColor: "divider", 
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ display: "flex", height:"12vh", justifyContent: "space-between" }}>
          <Typography variant="h6" color="text.primary">
            Flow Analytics {flowId && `(ID: ${flowId.slice(0, 8)}...)`}
          </Typography>
          <IconButton
            edge="in_o"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Tab bar */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: "background.paper" }}>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Logs" value="logs" />
          <Tab label="Charts" value="charts" />
          <Tab label="History" value="history" />
          <Tab label="Human in the Loop" value="hitl" />
        </Tabs>
      </Box>

      {/* Main content area */}
      <Box 
        sx={{ 
          height: "calc(100vh - 12vh - 48px)", // Full height minus appbar and tabs
          overflow: 'auto', 
          bgcolor: "background.default",
          p: 3 // Add some padding to the content area
        }}
      >
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
    </Dialog>
  );
}