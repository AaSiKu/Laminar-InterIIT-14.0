
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
  Step,
  StepLabel,
  Stepper,
  useTheme,
} from "@mui/material";
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector";
import { styled } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { PropertyInput } from "../components/PropertyInput";
import { nodeTypes, generateNode } from "../utils/dashboard.utils";
import { useGlobalContext } from "../context/GlobalContext";

const QontoConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 14 },
  [`&.${stepConnectorClasses.active}, &.${stepConnectorClasses.completed}`]: {
    [`& .QontoConnector-line`]: { borderColor: theme.palette.primary.main },
  },
  [`& .QontoConnector-line`]: {
    borderColor: theme.palette.divider,
    borderTopWidth: 3,
    borderRadius: 1,
  },
}));

const QontoStepIconRoot = styled("div")(({ theme, ownerState }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 28,
  width: 28,
  transition: "transform 0.2s ease",
  transform: ownerState.active ? "scale(1.08)" : "scale(1)",
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `2px solid ${
      ownerState.completed || ownerState.active
        ? theme.palette.primary.main
        : theme.palette.divider
    }`,
    backgroundColor: ownerState.completed
      ? theme.palette.primary.light + "40"
      : ownerState.active
      ? theme.palette.primary.main + "25"
      : theme.palette.background.paper,
    boxShadow: ownerState.active
      ? theme.palette.mode === "dark"
        ? "0 0 0 4px rgba(59,130,246,0.2)"
        : "0 6px 14px rgba(59,130,246,0.25)"
      : "none",
    transition: "all 0.2s ease",
  },
  "& .QontoStepIcon-circle": {
    position: "relative",
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: ownerState.completed || ownerState.active
      ? theme.palette.primary.main
      : theme.palette.text.disabled,
    boxShadow: ownerState.completed
      ? "0 0 0 2px rgba(34,197,94,0.25)"
      : ownerState.active
      ? "0 0 0 2px rgba(59,130,246,0.2)"
      : "none",
    transition: "all 0.2s ease",
  },
  "& .QontoStepIcon-completedIcon": {
    position: "relative",
    color: theme.palette.primary.main,
    fontSize: 18,
    zIndex: 1,
  },
}));

const QontoStepIcon = ({ active, completed, className }) => (
  <QontoStepIconRoot ownerState={{ active, completed }} className={className}>
    {completed ? (
      <CheckCircleRoundedIcon className="QontoStepIcon-completedIcon" />
    ) : (
      <span className="QontoStepIcon-circle" />
    )}
  </QontoStepIconRoot>
);

const EllipsisStepIcon = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: 28,
      width: 28,
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: (theme) => `2px dashed ${theme.palette.divider}`,
      },
    }}
  >
    <Typography variant="body2" component="span" sx={{ lineHeight: 1, fontWeight: 700, letterSpacing: 2 }}>
      …
    </Typography>
  </Box>
);

const PlaceholderStepIconRoot = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 28,
  width: 28,
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `2px dashed ${theme.palette.action.disabled}`,
    backgroundColor: theme.palette.action.hover,
  },
  "& .PlaceholderStepIcon-circle": {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: theme.palette.action.disabled,
  },
}));

const PlaceholderStepIcon = () => (
  <PlaceholderStepIconRoot>
    <span className="PlaceholderStepIcon-circle" />
  </PlaceholderStepIconRoot>
);

const ActiveStepLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  fontWeight: active ? 700 : 500,
  color: active ? theme.palette.text.primary : theme.palette.text.secondary,
  letterSpacing: active ? 0.4 : 0.2,
  textAlign: "center",
  transition: "color 0.2s ease, font-weight 0.2s ease, letter-spacing 0.2s ease",
}));

const MAX_STEPS_DISPLAY = 7;
const STEP_ITEM_WIDTH = 136;

const stringifyProperties = (properties = []) =>
  properties.map((prop) => {
    if (prop.type === "json") {
      if (!prop.value) return { ...prop, value: "" };
      if (typeof prop.value === "string") return { ...prop };
      return { ...prop, value: JSON.stringify(prop.value, null, 2) };
    }
    return { ...prop, value: prop.value ?? "" };
  });

const parseProperties = (properties = []) =>
  properties.map((prop) => {
    if (prop.type === "json") {
      if (!prop.value || !prop.value.toString().trim()) {
        throw new Error(`Property "${prop.label}" requires valid JSON.`);
      }
      return { ...prop, value: JSON.parse(prop.value) };
    }
    return { ...prop, value: prop.value };
  });

const computePropertyStatus = (properties = []) => {
  if (!properties.length) return "incomplete";
  const hasEmpty = properties.some((prop) => {
    if (prop.type === "json") {
      return typeof prop.value === "string" ? !prop.value.trim() : !prop.value;
    }
    return `${prop.value ?? ""}`.trim() === "";
  });
  return hasEmpty ? "incomplete" : "complete";
};

const buildSchemaFromNode = (node, inboundEdgeCount) => {
  const baseProperties = {
    node_id: { const: node.node_id },
    category: { const: node.category },
    n_inputs: { const: inboundEdgeCount },
  };

  node.data?.properties?.forEach((prop) => {
    baseProperties[prop.label] = {
      default: prop.value,
      type: prop.type,
    };
  });

  return {
    title: node.data?.ui?.label ?? node.id,
    node_id: node.node_id,
    properties: baseProperties,
  };
};

const hydrateNodes = (blueprint) => {
  const inboundCount = blueprint.edges.reduce((acc, edge) => {
    acc[edge.target] = (acc[edge.target] || 0) + 1;
    return acc;
  }, {});

  const nodes = [];
  blueprint.nodes.forEach((rawNode) => {
    const schema = buildSchemaFromNode(rawNode, inboundCount[rawNode.id] || 0);
    const generated = generateNode(schema, nodes);

    nodes.push({
      ...generated,
      id: rawNode.id,
      position: rawNode.position || generated.position,
      data: {
        ...generated.data,
        ui: {
          ...(generated.data?.ui || {}),
          label: rawNode.data?.ui?.label ?? generated.data?.ui?.label,
          iconUrl: rawNode.data?.ui?.iconUrl ?? generated.data?.ui?.iconUrl,
        },
        properties: rawNode.data?.properties ?? [],
        status: "unvisited",
        visited: false,
        hasSaved: false,
      },
      category: rawNode.category,
      node_id: rawNode.node_id,
    });
  });

  return nodes;
};

const hydrateEdges = (edges = []) =>
  edges.map((edge) => ({ animated: false, type: "smoothstep", ...edge }));

const findNextIncompleteNodeId = (nodes, currentNodeId) => {
  if (!nodes.length) return null;

  const ordered = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const currentIdx = currentNodeId ? ordered.findIndex((n) => n.id === currentNodeId) : -1;

  for (let i = currentIdx + 1; i < ordered.length; i++) {
    if (ordered[i].data?.status !== "complete") return ordered[i].id;
  }

  for (let i = 0; i <= currentIdx; i++) {
    if (ordered[i].data?.status !== "complete") return ordered[i].id;
  }

  return null;
};

const DEFAULT_BLUEPRINT = { name: "New Workflow", nodes: [], edges: [] };

export const DeveloperDashboardProject = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    setCurrentNodes: setDashboardNodes,
    setCurrentEdges: setDashboardEdges,
    setViewport,
    setCurrentPipelineStatus,
    setContainerId,
    setCurrentPipelineId,
  } = useGlobalContext();

  const blueprint = useMemo(() => state?.workflowBlueprint || DEFAULT_BLUEPRINT, [state?.workflowBlueprint]);
  const initialNodes = useMemo(() => hydrateNodes(blueprint), [blueprint]);
  const initialEdges = useMemo(() => hydrateEdges(blueprint.edges), [blueprint.edges]);
  const initialSelectedId = useMemo(() => {
    const next = findNextIncompleteNodeId(initialNodes);
    return next || initialNodes[0]?.id || null;
  }, [initialNodes]);

  const [workflowData, setWorkflowData] = useState(blueprint);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(initialSelectedId);
  const [propertyDrafts, setPropertyDrafts] = useState(() => {
    const node = initialNodes.find((n) => n.id === initialSelectedId);
    return node ? stringifyProperties(node.data?.properties ?? []) : [];
  });
  const [snackbar, setSnackbar] = useState({ open: false, severity: "info", message: "" });
  const activeStepRef = useRef(null);

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

  const handleNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const handleEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const handleConnect = useCallback((connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), []);
  const handleNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const handlePropertyChange = (index, value) => {
    setPropertyDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const resetDraftsToSelectedNode = () => {
    if (!selectedNodeId) {
      setPropertyDrafts([]);
      return;
    }
    const node = nodes.find((n) => n.id === selectedNodeId);
    setPropertyDrafts(node ? stringifyProperties(node.data?.properties ?? []) : []);
  };

  const handleCancel = () => {
    resetDraftsToSelectedNode();
    setSnackbar({ open: true, severity: "info", message: "Changes discarded." });
  };

  const handleSaveNode = () => {
    if (!selectedNodeId) return;

    const hasEmpty = propertyDrafts.some((prop) => {
      if (prop.type === "json") return !prop.value || !prop.value.toString().trim();
      return `${prop.value ?? ""}`.trim() === "";
    });

    if (hasEmpty) {
      setSnackbar({
        open: true,
        severity: "error",
        message: "Please complete all required properties before saving.",
      });
      return;
    }

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

      setDashboardNodes?.(finalNodes);
      setDashboardEdges?.(edges.map((edge) => ({ ...edge })));
      setCurrentPipelineStatus?.(false);
      setContainerId?.(null);
      setCurrentPipelineId?.(null);
      setViewport?.({ x: 0, y: 0, zoom: 1 });
      navigate("/dashboard");
      return;
    }

    setSnackbar({ open: true, severity: "success", message: "Properties saved successfully!" });
    if (nextNodeId) setSelectedNodeId(nextNodeId);
  };

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const orderedNodes = useMemo(() => [...nodes].sort((a, b) => a.id.localeCompare(b.id)), [nodes]);

  const { stepItems, activeStepIndex } = useMemo(() => {
    if (!orderedNodes.length) return { stepItems: [], activeStepIndex: 0 };

    const maxVisible = MAX_STEPS_DISPLAY;
    const resolvedSelectedId = selectedNodeId || orderedNodes[0].id;
    const selectedIndex = Math.max(0, orderedNodes.findIndex((node) => node.id === resolvedSelectedId));

    if (orderedNodes.length <= maxVisible) {
      return {
        stepItems: orderedNodes.map((node) => ({
          key: node.id,
          type: "node",
          node,
          label: node.data?.ui?.label || node.id,
        })),
        activeStepIndex: selectedIndex,
      };
    }

    const halfWindow = Math.floor(maxVisible / 2);
    let start = selectedIndex - halfWindow;
    let end = selectedIndex + halfWindow + 1;

    if (start < 0) {
      end += -start;
      start = 0;
    }
    if (end > orderedNodes.length) {
      start = Math.max(0, start - (end - orderedNodes.length));
      end = orderedNodes.length;
    }

    let items = orderedNodes.slice(start, end).map((node) => ({
      key: node.id,
      type: "node",
      node,
      label: node.data?.ui?.label || node.id,
    }));

    let activeIndex = items.findIndex((item) => item.node.id === resolvedSelectedId);
    const needsLeftEllipsis = start > 0;
    const needsRightEllipsis = end < orderedNodes.length;

    if (needsLeftEllipsis) {
      items = [{ key: "ellipsis-start", type: "ellipsis", label: "…" }, ...items];
      activeIndex += 1;
    }

    if (needsRightEllipsis) {
      items = [...items, { key: "ellipsis-end", type: "ellipsis", label: "…" }];
    }

    while (items.length > maxVisible) {
      if (needsRightEllipsis && items[items.length - 1].type === "ellipsis") {
        items.splice(items.length - 2, 1);
      } else if (needsLeftEllipsis && items[0].type === "ellipsis") {
        items.splice(1, 1);
        activeIndex = Math.max(activeIndex - 1, 0);
      } else if (activeIndex > Math.floor(items.length / 2)) {
        items.splice(1, 1);
        activeIndex = Math.max(activeIndex - 1, 0);
      } else {
        items.splice(items.length - 2, 1);
      }
    }

    return { stepItems: items, activeStepIndex: Math.max(activeIndex, 0) };
  }, [orderedNodes, selectedNodeId]);

  const allNodesVisited = nodes.length > 0 && nodes.every((node) => node.data?.visited);
  const allNodesComplete = nodes.length > 0 && nodes.every((node) => node.data?.status === "complete");
  const primaryActionLabel = allNodesVisited && allNodesComplete ? "Save" : "Next";
  
  const stepperPaddingLeft = stepItems.length >= MAX_STEPS_DISPLAY
    ? Math.max(0, Math.floor(MAX_STEPS_DISPLAY / 2) - activeStepIndex) * STEP_ITEM_WIDTH
    : 0;

  const renderedStepItems = stepItems.length > 0
    ? stepItems
    : [{ key: "placeholder-step", type: "placeholder", label: "Awaiting workflow nodes" }];

  const stepperActiveIndex = stepItems.length > 0 ? activeStepIndex : 0;

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeStepIndex, stepItems.length]);

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", backdropFilter: "blur(6px)" }}>
        <Toolbar sx={{ minHeight: { xs: 56, md: 64 }, px: { xs: 2.5, lg: 5 }, py: 1, display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2, flexWrap: { xs: "wrap", md: "nowrap" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "rgba(71, 85, 105, 1)", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
                Workflow
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "rgba(15, 23, 42, 1)" }}>
                {workflowData.name}
              </Typography>
            </Box>
          </Box>

          <Stepper
            alternativeLabel
            activeStep={stepperActiveIndex}
            connector={<QontoConnector />}
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 800 },
              flexShrink: 1,
              display: "flex",
              justifyContent: "center",
              flexWrap: "nowrap",
              pl: stepperPaddingLeft ? `${stepperPaddingLeft}px` : 0,
              "& .MuiStep-root": {
                flex: "0 0 auto",
                px: { xs: 0.75, md: 1.25 },
                "& .MuiStepLabel-iconContainer": {
                  position: "relative",
                  top: 2,
                  transition: "transform 0.2s ease",
                },
              },
              "& .MuiStepLabel-label": {
                typography: "caption",
                textTransform: "none",
                whiteSpace: "nowrap",
                mt: 0,
              },
              "& .MuiStepLabel-labelContainer": { mt: 0 },
            }}
          >
            {renderedStepItems.map((item) => {
              const isNodeStep = item.type === "node";
              const isActive = isNodeStep && item.node.id === selectedNodeId;
              const StepIconComponent = item.type === "ellipsis" ? EllipsisStepIcon : item.type === "placeholder" ? PlaceholderStepIcon : QontoStepIcon;

              return (
                <Step key={item.key} completed={isNodeStep && item.node?.data?.status === "complete"} disabled={!isNodeStep}>
                  <StepLabel
                    StepIconComponent={StepIconComponent}
                    onClick={() => isNodeStep && setSelectedNodeId(item.node.id)}
                    sx={{ cursor: isNodeStep ? "pointer" : "default", px: 1, alignItems: "center", "& .MuiStepLabel-labelContainer": { mt: 0 } }}
                  >
                    <Box ref={isActive ? activeStepRef : null} sx={{ width: STEP_ITEM_WIDTH, display: "flex", alignItems: "center", justifyContent: "center", px: 1, py: 0.5 }}>
                      <ActiveStepLabel variant="body2" noWrap active={isActive}>
                        {item.label}
                      </ActiveStepLabel>
                    </Box>
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flex: 1, display: "flex", flexDirection: "column", gap: { xs: 2, lg: 2.5 }, py: { xs: 2, lg: 2.5 }, px: { xs: 3, lg: 6 }, pb: { xs: 3, lg: 4 }, minHeight: 0 }}>
        <Box sx={{ display: "flex", flex: 1, gap: { xs: 3, lg: 4 }, alignItems: "stretch", flexWrap: { xs: "wrap", lg: "nowrap" }, minHeight: 0 }}>
          <Paper
            elevation={0}
            sx={{
              flexBasis: { xs: "100%", lg: "28%" },
              maxWidth: { xs: "100%", lg: "28%" },
              minWidth: 320,
              flexShrink: 0,
              borderRadius: 3,
              border: "1px solid rgba(30, 58, 138, 0.25)",
              backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(248, 250, 252, 1)",
              display: "flex",
              flexDirection: "column",
              p: { xs: 3, lg: 3.5 },
              gap: 2.5,
              height: { xs: "auto", lg: "100%" },
              minHeight: { xs: "auto", lg: 520 },
              boxShadow: (theme) => theme.palette.mode === "dark" ? "0 4px 20px rgba(0, 0, 0, 0.5)" : "0 8px 32px rgba(30, 58, 138, 0.08)",
            }}
          >
            <Box sx={{ pt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "rgba(71, 85, 105, 1)", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
                Property Editor
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "rgba(15, 23, 42, 1)", mt: 0.5 }}>
                {selectedNode?.data?.ui?.label || selectedNode?.id || "No node selected"}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(100, 116, 139, 1)", mt: 0.5 }}>
                Complete node configuration to move forward.
              </Typography>
            </Box>

            <Divider />

            {!selectedNode ? (
              <Alert severity="info">Select a node from the canvas to configure its properties.</Alert>
            ) : propertyDrafts.length === 0 ? (
              <Alert severity="info">This node has no configurable properties.</Alert>
            ) : (
              <Stack spacing={2} sx={{ flexGrow: 1, overflowY: "auto", pr: 1, pt: 0.5 }}>
                {propertyDrafts.map((prop, index) => (
                  <PropertyInput
                    key={`${prop.label}-${index}`}
                    property={prop}
                    onChange={(event) => handlePropertyChange(index, event.target.value)}
                  />
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" color="inherit" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" color="primary" onClick={handleSaveNode} disabled={!selectedNode || propertyDrafts.length === 0}>
                {primaryActionLabel}
              </Button>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              flexGrow: 1,
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid rgba(30, 58, 138, 0.25)",
              position: "relative",
              minHeight: { xs: 520, lg: 600 },
              display: "flex",
              p: { xs: 2.5, lg: 3 },
              backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(248, 250, 252, 1)",
              boxShadow: (theme) => theme.palette.mode === "dark" ? "0 4px 20px rgba(0, 0, 0, 0.5)" : "0 8px 32px rgba(30, 58, 138, 0.08)",
            }}
          >
            <Box sx={{ borderRadius: 2, overflow: "hidden", border: (theme) => `1px solid ${theme.palette.divider}`, flex: 1 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                onNodeClick={handleNodeClick}
                fitView
                style={{ width: "100%", height: "100%" }}
              >
                <Background gap={22} color="#e5e7eb" />
                <MiniMap
                  nodeColor={(node) =>
                    node.data?.status === "complete" ? "#22c55e" : node.data?.status === "unvisited" ? "#ef4444" : "#f97316"
                  }
                  position="bottom-right"
                />
                <Controls position="top-right" />
              </ReactFlow>
            </Box>
          </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleCloseSnackbar}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
    </Box>
  );
};

export default DeveloperDashboardProject;
