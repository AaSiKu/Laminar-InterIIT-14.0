import { useState } from 'react';
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/sidebar.jsx";
import DashboardSidebar from "./components/DashboardSidebar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";



export default function App() {
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [sidebarOpen, setSideBarOpen]= useState(false);

  return (
    <Router>
      <AuthProvider>
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
        />

        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<LoginPage />} />
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
      </AuthProvider>
    </Router>
  );
}
