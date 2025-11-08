import { useState, useContext } from 'react';
import { ThemeProvider, createTheme, Box } from "@mui/material";
import { BrowserRouter, Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import  Dashboard  from './pages/Dashboard.jsx';
import Sidebar from './components/sidebar.jsx';
import DashboardSidebar from './components/DashboardSidebar.jsx'

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

  return (
    <>
        {/* Sidebar and dashboard sidebar */}
        <Sidebar/>
        <DashboardSidebar/>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<LoginPage/>} />
          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/analytics/:flowId" element={<AnalyticsPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard/>
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    </>
  );
}
