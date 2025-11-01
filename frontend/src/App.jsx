import { useState } from 'react';
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { Dashboard } from './Dashboard.jsx';
import Sidebar from './components/sidebar.jsx';
import DashboardSidebar from './components/DashboardSidebar.jsx';

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
// In your parent component
const fileStructure = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'Header.jsx', type: 'file' },
          { name: 'Footer.jsx', type: 'file' },
        ]
      },
      {
        name: 'pages',
        type: 'folder',
        children: [
          { name: 'Home.jsx', type: 'file' },
          { name: 'About.jsx', type: 'file' },
        ]
      },
      { name: 'App.jsx', type: 'file' },
    ]
  },
  {
    name: 'public',
    type: 'folder',
    children: [
      { name: 'index.html', type: 'file' },
    ]
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
];



export default function App() {
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <Sidebar 
          setDashboardSidebarOpen={setDashboardSidebarOpen} 
          dashboardSidebarOpen={dashboardSidebarOpen} 
        />
        
        <DashboardSidebar 
          open={dashboardSidebarOpen} 
          onClose={() => setDashboardSidebarOpen(false)}
          fileStructure={fileStructure}
        />
        <Dashboard 
          sidebarOpen={true} 
          dashboardSidebarOpen={dashboardSidebarOpen} 
        />
      </Box>
    </ThemeProvider>
  );
}