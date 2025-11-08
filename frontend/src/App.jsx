import { useState, useContext } from 'react';
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import { AuthContext } from './context/AuthContext';
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
    const {login, isAuthenticated } = useContext(AuthContext);
    const [sidebarOpen, setSideBarOpen]= useState(false);
    const {fileStructure,setFileStructure}=useState({});

  return (
    <>
        {/* Sidebar and dashboard sidebar */}
        <Sidebar
          setDashboardSidebarOpen={setDashboardSidebarOpen}
          dashboardSidebarOpen={dashboardSidebarOpen}
          sidebarOpen={sidebarOpen}
          setSideBarOpen={setSideBarOpen}
        />
        <DashboardSidebar
          open={dashboardSidebarOpen}
          onClose={() => setDashboardSidebarOpen(false)}
          fileStructure={fileStructure}
          setFileStructure={setFileStructure}
          nodes={nodes}
          setNodes={setNodes}
          edges={edges}
          setEdges={setEdges}

        />

        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<LoginPage 
            login={login}
            isAuthenticated={isAuthenticated}
          />} />
          <Route path="/auth/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard
                  dashboardSidebarOpen={dashboardSidebarOpen}
                  setDashboardSidebarOpen={setDashboardSidebarOpen}
                  nodes={nodes}
                  setNodes={setNodes}
                  edges={edges}
                  setEdges={setEdges}
                  login={login}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    </>
  );
}
