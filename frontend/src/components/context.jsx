import { createContext, useContext, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";

const GlobalContext = createContext();

export function useGlobalContext() {
  return useContext(GlobalContext);
}

export const GlobalContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roll, setRoll] = useState(null);
  const [currentPipelineId, setCurrentPipelineId] = useState(null);
  const [currentPipelineStatus, setCurrentPipelineStatus] = useState(true);
  const [currentNodes, setCurrentNodes] = useState([]);
  const [currentEdges, setCurrentEdges] = useState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const { setViewport } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [containerId, setContainerId] = useState(null);

  const globalContextValue = {
    user,
    roll,
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
  };

  return (
    <GlobalContext.Provider value={globalContextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
