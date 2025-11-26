import { createContext, useContext, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { AuthContext } from './AuthContext';
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
  const [containerId, setContainerId] = useState('73b6fc3055a7f0e228ae2eff2dfa8e760d667cbe280af80cda189bf12faf69c2');
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(false);
  const {login, user, logout, isAuthenticated } = useContext(AuthContext);
  const [sidebarOpen, setSideBarOpen]= useState(false);
  const {fileStructure,setFileStructure}=useState({});

  const globalContextValue = {
    user,
    roll,
    setRoll,
    currentPipelineId,
    setCurrentPipelineId,
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
    dashboardSidebarOpen,
    setDashboardSidebarOpen,
    login,
    isAuthenticated,
    sidebarOpen,
    setSideBarOpen,
    fileStructure,
    setFileStructure,
    logout
  };

const location = useLocation();

useEffect(() => {
  if (location.pathname !== "/dashboard") {
    setDashboardSidebarOpen(false);
  }
}, [location.pathname]);

  return (
    <GlobalContext.Provider value={globalContextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
