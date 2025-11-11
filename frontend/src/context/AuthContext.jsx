import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load token from cookies when app starts
  useEffect(() => {
    const token = Cookies.get("access_token");
    if (token) setUser({ token });
  }, []);

  // Login → Save tokens in cookies
  const login = (data) => {
    Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "Lax" }); // expires in 1 day
    Cookies.set("refresh_token", data.refresh_token, { expires: 7, sameSite: "Lax" }); // refresh token lasts longer
    setUser({ token: data.access_token });
  };

  // Logout → Remove cookies
  const logout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    setUser(null);
    navigate("/auth/login");
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
