import { useState, useContext } from 'react';
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/sidebar.jsx";
import DashboardSidebar from "./components/DashboardSidebar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import { AuthContext } from './context/AuthContext';



export default function App() {
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const {login, isAuthenticated } = useContext(AuthContext);
    const [sidebarOpen, setSideBarOpen]= useState(false);

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
