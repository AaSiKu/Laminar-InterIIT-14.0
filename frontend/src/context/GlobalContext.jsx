import { createContext, useContext, useState } from "react";
import { AuthContext } from "./AuthContext";

const GlobalContext = createContext();

export function useGlobalContext() {
  return useContext(GlobalContext);
}

export const GlobalContextProvider = ({ children }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [containerId, setContainerId] = useState();
  const { login, user, logout, isAuthenticated } = useContext(AuthContext);
  const [sidebarOpen, setSideBarOpen] = useState(false);
  const { fileStructure, setFileStructure } = useState({});
  const [agentContainerId, setAgentContainerId] = useState(null);

  const globalContextValue = {
    user,
    role,
    setRole,
    loading,
    setLoading,
    error,
    setError,
    containerId,
    setContainerId,
    agentContainerId,
    setAgentContainerId,
    login,
    isAuthenticated,
    sidebarOpen,
    setSideBarOpen,
    fileStructure,
    setFileStructure,
    logout,
  };

  return (
    <GlobalContext.Provider value={globalContextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
