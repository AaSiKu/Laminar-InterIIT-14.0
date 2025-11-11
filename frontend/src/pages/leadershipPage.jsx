import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

// --- Data Fetching Functions (Hardcoded for now, ready for API integration) ---
const fetchKpiData = async () => {
  // Real Fetch (Placeholder): 
  // const response = await fetch('/api/leadership/kpi');
  // return await response.json();
  
  // Hardcoded Data:
  return [
    { title: 'Pipelines Running', value: '8', description: 'Currently active pipelines' },
    { title: 'Total Pipelines', value: '25', description: 'Total deployed pipeline instances' },
    { title: 'Average Runtime', value: '3.2 hrs', description: 'Mean duration per pipeline' },
    { title: 'Alerts Today', value: '5', description: 'Total alerts generated today' },
  ];
};

const fetchPipelines = async () => {
  // Real Fetch (Placeholder): 
  // const response = await fetch('/api/leadership/pipelines');
  // return await response.json();
  
  // Hardcoded Data:
  return [
    { id: 1, name: 'Pipeline A', status: 'Running', breachReason: 'Disk I/O saturation', lastBreachTime: '10:30 AM', owner: 'Team Alpha' },
    { id: 2, name: 'Pipeline B', status: 'Completed', breachReason: '-', lastBreachTime: '9:00 AM', owner: 'Team Beta' },
    { id: 3, name: 'Pipeline C', status: 'Failed', breachReason: 'Network timeout', lastBreachTime: '11:15 AM', owner: 'Team Gamma' },
    { id: 4, name: 'Pipeline D', status: 'Running', breachReason: 'Input data skew', lastBreachTime: '12:05 PM', owner: 'Team Delta' },
    { id: 5, name: 'Pipeline E', status: 'Running', breachReason: 'Memory pressure', lastBreachTime: '1:20 PM', owner: 'Team Alpha' },
    { id: 6, name: 'Pipeline F', status: 'Completed', breachReason: '-', lastBreachTime: '8:45 AM', owner: 'Team Beta' },
  ];
};

// --- KPI Card Component ---
function KpiCard({ title, value, description }) {
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        height: '100%',
        textAlign: 'center',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(-4px)',
        },
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h3" fontWeight="bold" sx={{ my: 2 }} color="primary.main">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

// --- Pipeline Table Component ---
function PipelineTable({ pipelines }) {
  return (
    <TableContainer>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>
              Pipeline Name
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>
              Status
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>
              Breach Reason
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>
              Last Breach Time
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>
              Owner
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pipelines.map((pipeline) => (
            <TableRow 
              key={pipeline.id} 
              hover
              sx={{
                transition: 'background-color 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  cursor: 'pointer',
                },
              }}
            >
              <TableCell>{pipeline.name}</TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  fontWeight={pipeline.status === 'Running' ? 'bold' : 'normal'}
                  color={
                    pipeline.status === 'Running'
                      ? 'success.main'
                      : pipeline.status === 'Failed'
                      ? 'error.main'
                      : 'text.primary'
                  }
                >
                  {pipeline.status}
                </Typography>
              </TableCell>
              <TableCell>{pipeline.breachReason === '-' ? '-' : pipeline.breachReason}</TableCell>
              <TableCell>{pipeline.lastBreachTime}</TableCell>
              <TableCell>{pipeline.owner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// --- Main Leadership Dashboard Component ---
export function LeadershipDashboard() {
  const [kpiData, setKpiData] = useState([]);
  const [pipelines, setPipelines] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const kpi = await fetchKpiData();
      const pipelineData = await fetchPipelines();
      setKpiData(kpi);
      setPipelines(pipelineData);
    };
    loadData();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Header Title */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Leadership Dashboard
      </Typography>

      {/* KPI Summary Cards Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiData.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <KpiCard title={kpi.title} value={kpi.value} description={kpi.description} />
          </Grid>
        ))}
      </Grid>

      {/* Active Pipelines Table Section */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="medium" sx={{ mb: 2 }}>
          Active Pipelines Overview
        </Typography>
        <PipelineTable pipelines={pipelines} />
      </Paper>
    </Box>
  );
}
