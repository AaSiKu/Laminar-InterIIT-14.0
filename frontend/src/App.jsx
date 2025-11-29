//TODO: Add a loading state to the app
//TODO: Add the use notification hook to the app and add to the notification in developer dashboard
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login.jsx";
import SignupPage from "./pages/Signup.jsx";
import WorkflowPage from "./pages/Workflows.jsx";
import Sidebar from "./components/sidebar.jsx";
import OverviewPage from "./pages/Overview.jsx";
import { AdminPage } from "./pages/Admin.jsx";
import { DeveloperDashboardProject } from "./pages/DeveloperDashboardProject.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { Box } from "@mui/material";
function AppContent() {
  const location = useLocation();
  const isPublicRoute = ["/", "/login", "/signup", "*"];

  // TODO: 404 page
  return (
    <>
      {!isPublicRoute.includes(location.pathname) && <Sidebar />}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          marginLeft: isPublicRoute ? "0" : "64px",
        }}
      >
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Navigate to="/overview" />} />

          {/* Protected routes */}
          <Route
            path="/workflow"
            element={
              <ProtectedRoute>
                <WorkflowPage />
              </ProtectedRoute>
            }
          />
          {/* Default route */}
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <OverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developer-dashboard/:projectId"
            element={
              <ProtectedRoute>
                <DeveloperDashboardProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
