import { useState } from "react";
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Sidebar from "./components/sidebar.jsx";
import DashboardSidebar from "./components/DashboardSidebar.jsx";
import DeveloperDashboard from "./pages/DeveloperDashboard.jsx";
import { LeadershipDashboard } from "./leadershipPage.jsx";
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
    name: "src",
    type: "folder",
    id: "123",
    children: [
      {
        name: "components",
        type: "folder",
        id: "1234",
        children: [
          { name: "Header.jsx", type: "file", id: "124" },
          { name: "Footer.jsx", type: "file", id: "234" },
        ],
      },
      {
        name: "pages",
        type: "folder",
        id: "2345",
        children: [
          { name: "Home.jsx", type: "file", id: "3458" },
          { name: "About.jsx", type: "file", id: "3456" },
        ],
      },
      { name: "App.jsx", type: "file", id: "4567548" },
    ],
  },
  {
    name: "public",
    type: "folder",
    id: "35786",
    children: [{ name: "index.html", type: "file", id: "6345" }],
  },
  { name: "package.json", type: "file" },
  { name: "README.md", type: "file" },
];

export default function App() {
  return (
    <>
      {/* Sidebar and dashboard sidebar */}
      <Sidebar />
      <DashboardSidebar />
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
            // <ProtectedRoute>
              <DeveloperDashboard />
            // {/* </ProtectedRoute> */}
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
    </>
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
