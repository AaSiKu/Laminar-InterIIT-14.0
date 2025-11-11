import { useEffect, useMemo, useRef } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  StepConnector,
  stepConnectorClasses,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

const MAX_STEPS_DISPLAY = 7;
const STEP_ITEM_WIDTH = 112;

const QontoConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 12 },
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
  height: 26,
  width: 26,
  transition: "transform 0.2s ease",
  transform: ownerState.active ? "scale(1.05)" : "scale(1)",
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
        ? "0 0 0 4px rgba(59,130,246,0.18)"
        : "0 6px 14px rgba(59,130,246,0.2)"
      : "none",
    transition: "all 0.2s ease",
  },
  "& .QontoStepIcon-circle": {
    position: "relative",
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor:
      ownerState.completed || ownerState.active
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
      height: 26,
      width: 26,
      position: "relative",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: (theme) => `2px dashed ${theme.palette.divider}`,
      },
    }}
  >
    <Typography
      variant="body2"
      component="span"
      sx={{ lineHeight: 1, fontWeight: 700, letterSpacing: 2 }}
    >
      …
    </Typography>
  </Box>
);

const PlaceholderStepIcon = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      height: 26,
      width: 26,
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: (theme) => `2px dashed ${theme.palette.action.disabled}`,
        backgroundColor: (theme) => theme.palette.action.hover,
      },
      "& .PlaceholderStepIcon-circle": {
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: (theme) => theme.palette.action.disabled,
      },
    }}
  >
    <span className="PlaceholderStepIcon-circle" />
  </Box>
);

const ActiveStepLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  fontWeight: active ? 700 : 500,
  color: active ? theme.palette.text.primary : theme.palette.text.secondary,
  letterSpacing: active ? 0.2 : 0.1,
  textAlign: "center",
  transition: "color 0.2s ease, font-weight 0.2s ease, letter-spacing 0.2s ease",
}));

const useStepItems = (nodes, selectedNodeId) => {
  return useMemo(() => {
    if (!nodes.length) {
      return {
        renderedStepItems: [
          { key: "placeholder-step", type: "placeholder", label: "Awaiting workflow nodes" },
        ],
        activeIndex: 0,
      };
    }

    const orderedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const resolvedSelectedId = selectedNodeId || orderedNodes[0].id;
    const selectedIndex = Math.max(
      0,
      orderedNodes.findIndex((node) => node.id === resolvedSelectedId)
    );

    if (orderedNodes.length <= MAX_STEPS_DISPLAY) {
      const items = orderedNodes.map((node) => ({
        key: node.id,
        type: "node",
        node,
        label: node.data?.ui?.label || node.id,
      }));
      return { renderedStepItems: items, activeIndex: selectedIndex };
    }

    const halfWindow = Math.floor(MAX_STEPS_DISPLAY / 2);
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

    while (items.length > MAX_STEPS_DISPLAY) {
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

    return { renderedStepItems: items, activeIndex: Math.max(activeIndex, 0) };
  }, [nodes, selectedNodeId]);
};

const WorkflowStepper = ({ nodes, selectedNodeId, onSelectNode }) => {
  const activeStepRef = useRef(null);
  const { renderedStepItems, activeIndex } = useStepItems(nodes, selectedNodeId);

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeIndex, renderedStepItems.length]);

  return (
    <Stepper
      alternativeLabel
      activeStep={activeIndex}
      connector={<QontoConnector />}
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", md: 760 },
        flexShrink: 1,
        display: "flex",
        justifyContent: "center",
        flexWrap: "nowrap",
        "& .MuiStep-root": {
          flex: "0 0 auto",
          px: { xs: 0.35, md: 0.6 },
          "& .MuiStepLabel-iconContainer": {
            position: "relative",
            top: 1,
            transition: "transform 0.2s ease",
            mr: 0.35,
          },
        },
        "& .MuiStepLabel-label": {
          typography: "caption",
          textTransform: "none",
          whiteSpace: "nowrap",
          mt: 0,
        },
        "& .MuiStepLabel-labelContainer": {
          mt: 0,
          ml: 0.25,
        },
      }}
    >
      {renderedStepItems.map((item) => {
        const isNodeStep = item.type === "node";
        const isActive = isNodeStep && item.node.id === selectedNodeId;
        const StepIconComponent =
          item.type === "ellipsis" ? EllipsisStepIcon : item.type === "placeholder" ? PlaceholderStepIcon : QontoStepIcon;

        return (
          <Step
            key={item.key}
            completed={isNodeStep && item.node?.data?.status === "complete"}
            disabled={!isNodeStep}
          >
            <StepLabel
              StepIconComponent={StepIconComponent}
              onClick={() => isNodeStep && onSelectNode(item.node.id)}
              sx={{
                cursor: isNodeStep ? "pointer" : "default",
                px: 0.25,
                alignItems: "center",
                "& .MuiStepLabel-labelContainer": { mt: 0 },
              }}
            >
              <Box
                ref={isActive ? activeStepRef : null}
                sx={{
                  width: STEP_ITEM_WIDTH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 0.5,
                  py: 0.25,
                }}
              >
                <ActiveStepLabel variant="body2" noWrap active={isActive}>
                  {item.label}
                </ActiveStepLabel>
              </Box>
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
};

export default WorkflowStepper;

