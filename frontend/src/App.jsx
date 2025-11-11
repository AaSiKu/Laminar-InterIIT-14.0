//TODO: Add a loading state to the app
//TODO: Add the use notification hook to the app and add to the notification in developer dashboard 
// use /me to get user whenever page reloads
import { useState } from "react";
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Sidebar, { SIDEBAR_WIDTH } from "./components/sidebar.jsx";
import DashboardSidebar from "./components/DashboardSidebar.jsx";
import DeveloperDashboard from "./pages/DeveloperDashboard.jsx";
import { LeadershipDashboard } from "./pages/leadershipPage.jsx";
import { DeveloperDashboardProject } from "./pages/DeveloperDashboardProject.jsx";
import { useGlobalContext } from "./context/GlobalContext";
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

export default function App() {
  const { sidebarOpen } = useGlobalContext();

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <Sidebar />
        <DashboardSidebar />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: "100vh",
            bgcolor: "background.default",
          }}
        >
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
            <ProtectedRoute>
              <Dashboard />
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
        {/* Default route */}
        <Route
          path="/developer-dashboard"
          element={
            <ProtectedRoute>
              <DeveloperDashboard />
          </ProtectedRoute>
          }
        />
        <Route
          path="/developer-dashboard/:projectId"
          element={
            <ProtectedRoute>
              <DeveloperDashboardProject/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leadership"
          element={
            <ProtectedRoute>
              <LeadershipDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
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
