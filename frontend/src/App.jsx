import { useState } from 'react';
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // Import router
import { Dashboard } from './Dashboard.jsx';
import Sidebar from './components/sidebar.jsx';
import DashboardSidebar from './components/DashboardSidebar.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx'; // Import the new page
import { LeadershipDashboard } from './leadershipPage.jsx'; // Import the new page
// --- Theme (as you provided) ---
const theme = createTheme({
  palette: {
    primary: { main: "#3b82f6" },
    secondary: { main: "#10b981" },
    background: { default: "#f9fafb", paper: "#fff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    fontWeightMedium: 600,
  },
});

// --- FileStructure (as you provided) ---
const fileStructure = [
  {
    name: 'src',
    type: 'folder',
    id: '123',
    children: [
      {
        name: 'components',
        type: 'folder',
        id: '1234',
        children: [
          { name: 'Header.jsx', type: 'file', id:'124'},
          { name: 'Footer.jsx', type: 'file', id:'234'},
        ]
      },
      {
        name: 'pages',
        type: 'folder',
        id:'2345',
        children: [
          { name: 'Home.jsx', type: 'file', id: '3458'},
          { name: 'About.jsx', type: 'file', id: '3456'},
        ]
      },
      { name: 'App.jsx', type: 'file', id:'4567548'},
    ]
  },
  {
    name: 'public',
    type: 'folder',
    id: '35786',
    children: [
      { name: 'index.html', type: 'file', id:'6345' },
    ]
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
];

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          {/* Route for the main dashboard */}
          <Route path="/" element={<MainDashboardLayout />} />
          
          {/* Route for the analytics page */}
          <Route path="/analytics/:flowId" element={<AnalyticsPage />} />
          {/* Route for the leadership page */}
          <Route path="/leadership" element={<LeadershipDashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

// This component is your old App layout
function MainDashboardLayout() {
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar 
        setDashboardSidebarOpen={setDashboardSidebarOpen} 
        dashboardSidebarOpen={dashboardSidebarOpen} 
      />
      <DashboardSidebar 
        open={dashboardSidebarOpen} 
        onClose={() => setDashboardSidebarOpen(false)}
        fileStructure={fileStructure}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
      />
      <Dashboard 
        sidebarOpen={true} 
        dashboardSidebarOpen={dashboardSidebarOpen} 
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
      />
    </Box>
  );
}