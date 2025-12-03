import { createContext, useContext, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { AuthContext } from "./AuthContext";
import { useLocation } from "react-router-dom";

const GlobalContext = createContext();

export function useGlobalContext() {
  return useContext(GlobalContext);
}

export const GlobalContextProvider = ({ children }) => {
  const [role, setRole] = useState(null);
  const [currentPipelineId, setCurrentPipelineId] = useState("69138bfd2d5fe329d1dfe689");
  const [currentPipelineStatus, setCurrentPipelineStatus] = useState("Stopped");
  //TODO: Need to fix this for broken/etc
  const [notifications, setNotifications]= useState([]);
  const [currentNodes, setCurrentNodes] = useState([]);
  const [currentEdges, setCurrentEdges] = useState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const { setViewport } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [containerId, setContainerId] = useState();
  const { login, user, logout, isAuthenticated, ws, setWs } = useContext(AuthContext);
  const [sidebarOpen, setSideBarOpen] = useState(false);
  const { fileStructure, setFileStructure } = useState({});
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [agentContainerId, setAgentContainerId]=useState(null);
  const [workflows, setWorkflows] = useState([]);

  const globalContextValue = {
    user,
    role,
    setRole,
    workflows,
    setWorkflows,
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
    login,
    isAuthenticated,
    sidebarOpen,
    setSideBarOpen,
    fileStructure,
    setFileStructure,
    logout,
    notifications,
    setNotifications,
    ws,
    setWs
  };

  return (
    <GlobalContext.Provider value={globalContextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
