import { createContext, useContext, useState } from "react";
import { useReactFlow } from "@xyflow/react";

const GlobalWorkflowContext = createContext();

export function useGlobalWorkflow() {
  return useContext(GlobalWorkflowContext);
}

export const GlobalWorkflowProvider = ({ children }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [id, setId] = useState(null);
  const [versionId, setVersionId] = useState(null);
  const [status, setStatus] = useState("Stopped");
  const [rfInstance, setRfInstance] = useState(null);
  const { setViewport } = useReactFlow();

  const value = {
    // Workflow state
    nodes,
    setNodes,
    edges,
    setEdges,
    id,
    setId,
    versionId,
    setVersionId,
    status,
    setStatus,
    rfInstance,
    setRfInstance,
    setViewport,
  };

  return (
    <GlobalWorkflowContext.Provider value={value}>
      {children}
    </GlobalWorkflowContext.Provider>
  );
};





