import { useCallback, useEffect, useMemo, useState } from "react";
import { applyEdgeChanges, applyNodeChanges, addEdge } from "@xyflow/react";
import {
  computePropertyStatus,
  findNextIncompleteNodeId,
  hydrateEdges,
  hydrateNodes,
  parseProperties,
  stringifyProperties,
} from "../../utils/developerDashboardWorkflow";
import { generateNode } from "../../utils/dashboard.utils";
import { useGlobalContext } from "../../context/GlobalContext";

export const DEFAULT_BLUEPRINT = { name: "New Workflow", nodes: [], edges: [] };

const useWorkflowState = ({ blueprint, navigate }) => {
  const {
    setCurrentNodes,
    setCurrentEdges,
    setViewport,
    setCurrentPipelineStatus,
    setContainerId,
    setCurrentPipelineId,
  } = useGlobalContext();

  const hydratedBlueprint = useMemo(() => blueprint || DEFAULT_BLUEPRINT, [blueprint]);
  const initialNodes = useMemo(() => hydrateNodes(hydratedBlueprint, generateNode), [hydratedBlueprint]);
  const initialEdges = useMemo(() => hydrateEdges(hydratedBlueprint.edges), [hydratedBlueprint.edges]);
  const initialSelectedId = useMemo(() => {
    const next = findNextIncompleteNodeId(initialNodes);
    return next || initialNodes[0]?.id || null;
  }, [initialNodes]);

  const [workflowData, setWorkflowData] = useState(hydratedBlueprint);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(initialSelectedId);
  const [propertyDrafts, setPropertyDrafts] = useState(() => {
    const node = initialNodes.find((n) => n.id === initialSelectedId);
    return node ? stringifyProperties(node.data?.properties ?? []) : [];
  });
  const [snackbar, setSnackbar] = useState({ open: false, severity: "info", message: "" });

  useEffect(() => {
    if (!selectedNodeId) {
      setPropertyDrafts([]);
      return;
    }
    const node = nodes.find((n) => n.id === selectedNodeId);
    setPropertyDrafts(node ? stringifyProperties(node.data?.properties ?? []) : []);
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    setWorkflowData((prev) => ({ ...prev, edges }));
  }, [edges]);

  useEffect(() => {
    if (!selectedNodeId) return;
    setNodes((prevNodes) => {
      const nextNodes = prevNodes.map((node) => {
        if (node.id !== selectedNodeId || node.data?.visited) return node;
        const computed = computePropertyStatus(node.data?.properties ?? []);
        const nextStatus = node.data?.hasSaved && computed === "complete" ? "complete" : "incomplete";
        return {
          ...node,
          data: { ...node.data, visited: true, status: nextStatus },
        };
      });
      return nextNodes;
    });
  }, [selectedNodeId]);

  const handleNodesChange = useCallback((changes) => setNodes((prev) => applyNodeChanges(changes, prev)), []);
  const handleEdgesChange = useCallback((changes) => setEdges((prev) => applyEdgeChanges(changes, prev)), []);
  const handleConnect = useCallback(
    (connection) => setEdges((prev) => addEdge({ ...connection, animated: true }, prev)),
    []
  );

  const handleNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const handleCloseSnackbar = useCallback(
    () => setSnackbar((prev) => ({ ...prev, open: false })),
    []
  );

  const handlePropertyChange = useCallback((index, value) => {
    setPropertyDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  }, []);

  const resetDraftsToSelectedNode = useCallback(() => {
    if (!selectedNodeId) {
      setPropertyDrafts([]);
      return;
    }
    const node = nodes.find((n) => n.id === selectedNodeId);
    setPropertyDrafts(node ? stringifyProperties(node.data?.properties ?? []) : []);
  }, [nodes, selectedNodeId]);

  const handleCancel = useCallback(() => {
    resetDraftsToSelectedNode();
    setSnackbar({ open: true, severity: "info", message: "Changes discarded." });
  }, [resetDraftsToSelectedNode]);

  const handleSaveNode = useCallback(() => {
    if (!selectedNodeId) return;

    const hasEmpty = propertyDrafts.some((prop) => {
      if (prop.type === "json") return !prop.value || !prop.value.toString().trim();
      return `${prop.value ?? ""}`.trim() === "";
    });

    // if (hasEmpty) {
    //   setSnackbar({
    //     open: true,
    //     severity: "error",
    //     message: "Please complete all required properties before saving.",
    //   });
    //   return;
    // }

    let parsedProperties;
    try {
      parsedProperties = parseProperties(propertyDrafts);
    } catch (error) {
      setSnackbar({
        open: true,
        severity: "error",
        message: error.message || "Error parsing JSON. Please check the format.",
      });
      return;
    }

    const status = computePropertyStatus(parsedProperties);
    let nextNodeId = null;
    let updatedNodesSnapshot = nodes;

    const workflowWithUpdatedNode = {
      ...workflowData,
      nodes: workflowData.nodes.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, properties: parsedProperties } }
          : node
      ),
      edges,
    };

    setNodes((prevNodes) => {
      const updated = prevNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                properties: parsedProperties,
                status,
                visited: true,
              },
            }
          : node
      );
      nextNodeId = findNextIncompleteNodeId(updated, selectedNodeId);
      updatedNodesSnapshot = updated;
      return updated;
    });

    setWorkflowData(workflowWithUpdatedNode);

    const allVisited = updatedNodesSnapshot.every((node) => node.data?.visited);
    const allComplete = updatedNodesSnapshot.every((node) => node.data?.status === "complete");

    if (allVisited && allComplete) {
      const finalNodes = updatedNodesSnapshot.map((node) => ({
        ...node,
        data: { ...node.data, properties: node.data?.properties ?? [] },
      }));

      setCurrentNodes?.(finalNodes);
      setCurrentEdges?.(edges.map((edge) => ({ ...edge })));
      setCurrentPipelineStatus?.(false);//TODO: need to fix this for broken/running/etc pipeline
      setContainerId?.(null);
      setCurrentPipelineId?.(null);
      setViewport?.({ x: 0, y: 0, zoom: 1 });
      navigate("/workflow");
      return;
    }

    setSnackbar({ open: true, severity: "success", message: "Properties saved successfully!" });
    if (nextNodeId) setSelectedNodeId(nextNodeId);
  }, [
    selectedNodeId,
    propertyDrafts,
    nodes,
    workflowData,
    edges,
    setCurrentNodes,
    setCurrentEdges,
    setCurrentPipelineStatus,
    setContainerId,
    setCurrentPipelineId,
    setViewport,
    navigate,
  ]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const allNodesVisited = nodes.length > 0 && nodes.every((node) => node.data?.visited);
  const allNodesComplete = nodes.length > 0 && nodes.every((node) => node.data?.status === "complete");
  const primaryActionLabel = allNodesVisited && allNodesComplete ? "Save" : "Next";

  return {
    workflowName: workflowData.name,
    workflowData,
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    propertyDrafts,
    snackbar,
    primaryActionLabel,
    setSelectedNodeId,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    handleNodeClick,
    handlePropertyChange,
    handleCancel,
    handleSaveNode,
    handleCloseSnackbar,
  };
};

export default useWorkflowState;


