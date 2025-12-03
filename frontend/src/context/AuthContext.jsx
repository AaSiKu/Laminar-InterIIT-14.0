import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../components/common/Loading";
import { fetchNotifications } from "../utils/developerDashboard.api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs]= useState(null)
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_SERVER}/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          const notifs = await fetchNotifications();
          console.log("WebSocket created:", notifs);
          setWs(notifs);
        } else {
          setUser(null); 
          setWs(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);


  // Login: just update state and redirect; backend sets HttpOnly cookies
  const login = async (data) => {
    setUser(data);
          setWs( await fetchNotifications());
          console.log(ws)
    navigate("/overview");
  };

  // Logout: call backend to delete cookies
  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_SERVER}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      setWs(null);
      navigate("/login");
    }
  };

  const isAuthenticated = !!user;

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, ws, setWs }}>
      {children}
    </AuthContext.Provider>
  );
};
