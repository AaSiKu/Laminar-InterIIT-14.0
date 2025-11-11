//TODO: Add a loading state to the app
//TODO: Add the use notification hook to the app and add to the notification in developer dashboard 
// use /me to get user whenever page reloads
import { useState } from "react";
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Sidebar from "./components/sidebar.jsx";
import DashboardSidebar from "./components/DashboardSidebar.jsx";
import DeveloperDashboard from "./pages/DeveloperDashboard.jsx";
import { LeadershipDashboard } from "./pages/leadershipPage.jsx";
import { DeveloperDashboardProject } from "./pages/DeveloperDashboardProject.jsx";  

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

function AppContent() {
  const location = useLocation();
  
  // Check if current route is a public route (login, signup, analytics)
  const isPublicRoute = location.pathname.startsWith('/auth/') || 
                        location.pathname.startsWith('/analytics/');

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Conditionally render Sidebar and DashboardSidebar only for protected routes */}
      {!isPublicRoute && (
        <>
          <Box sx={{ position: "fixed", left: 0, top: 0, height: "100vh", zIndex: 1200 }}>
            <Sidebar />
          </Box>
          <Box sx={{ position: "fixed", left: 0, top: 0, height: "100vh", zIndex: 1300 }}>
            <DashboardSidebar />
          </Box>
        </>
      )}
      
      <Box sx={{ 
        flex: 1, 
        overflow: "auto", 
        marginLeft: isPublicRoute ? "0" : "64px" 
      }}>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/analytics/:flowId" element={<AnalyticsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              // <ProtectedRoute>
                <Dashboard />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              // <ProtectedRoute>
                <UsersPage />
              // </ProtectedRoute>
            }
          />
          {/* Default route */}
          <Route
            path="/developer-dashboard"
            element={
              // <ProtectedRoute>
                <DeveloperDashboard />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/developer-dashboard/:projectId"
            element={
              // <ProtectedRoute>
                <DeveloperDashboardProject/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/leadership"
            element={
              // <ProtectedRoute>
                <LeadershipDashboard />
              // </ProtectedRoute>
            }
          />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return <AppContent />;
}

// This component is your old App layout
function MainDashboardLayout() {
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  return (
    <Box sx={{ display: "flex" }}>
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