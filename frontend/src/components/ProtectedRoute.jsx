import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { NotificationProvider, NotificationToastContainer } from "./notifications";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>
  <NotificationProvider>
    <NotificationToastContainer /> 
    {children}
  </NotificationProvider></>;
};

export default ProtectedRoute;
