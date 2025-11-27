//TODO: Add a loading state to the app
//TODO: Add the use notification hook to the app and add to the notification in developer dashboard
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login.jsx";
import SignupPage from "./pages/Signup.jsx";
import Dashboard from "./pages/Workflows.jsx";
import Sidebar from "./components/sidebar.jsx";
import OverviewPage from "./pages/Overview.jsx"
import { AdminPage } from "./pages/Admin.jsx";
import { DeveloperDashboardProject } from "./pages/DeveloperDashboardProject.jsx";

function AppContent() {
  const location = useLocation();
  const isPublicRoute = ["/", "/login", "/signup"];

  return (
    <>
      {!isPublicRoute.includes(location.pathname) && <Sidebar />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<Navigate to="/overview" />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Default route */}
        <Route
          path="/developer-dashboard"
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
          path="/leadership"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
