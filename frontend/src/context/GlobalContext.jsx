import { createContext, useContext, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { AuthContext } from "./AuthContext";
import { useLocation } from "react-router-dom";

const GlobalContext = createContext();

export function useGlobalContext() {
  return useContext(GlobalContext);
}

export const GlobalContextProvider = ({ children }) => {
  const [roll, setRoll] = useState(null);
  const [currentPipelineId, setCurrentPipelineId] = useState("69138bfd2d5fe329d1dfe689");
  const [currentPipelineStatus, setCurrentPipelineStatus] = useState(true);
  const [currentNodes, setCurrentNodes] = useState([]);
  const [currentEdges, setCurrentEdges] = useState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const { setViewport } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [containerId, setContainerId] = useState();
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);
  const { login, user, logout, isAuthenticated } = useContext(AuthContext);
  const [sidebarOpen, setSideBarOpen] = useState(false);
  const { fileStructure, setFileStructure } = useState({});
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [agentContainerId, setAgentContainerId]=useState(null);

  const globalContextValue = {
    user,
    roll,
    setRoll,
    currentPipelineId,
    setCurrentPipelineId,
    currentVersionId,
    setCurrentVersionId,
    currentPipelineStatus,
    setCurrentPipelineStatus,
    currentEdges,
    currentNodes,
    setCurrentEdges,
    setCurrentNodes,
    setRfInstance,
    rfInstance,
    setViewport,
    loading,
    setLoading,
    error,
    setError,
    containerId,
    setContainerId,
    agentContainerId,
    setAgentContainerId,
    dashboardSidebarOpen,
    setDashboardSidebarOpen,
    login,
    isAuthenticated,
    sidebarOpen,
    setSideBarOpen,
    fileStructure,
    setFileStructure,
    logout,
  };

  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/workflow") {
      setDashboardSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <GlobalContext.Provider value={globalContextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
