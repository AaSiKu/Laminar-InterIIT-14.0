import React, { memo, useState, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import {
  Paper,
  Typography,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import { ContentCopy, ContentCut, Delete, FileCopy } from "@mui/icons-material";

export const BaseNode = memo(
  ({
    id,
    data,
    selected,
    inputs = [],
    outputs = [],
    properties = [],
    styles = {},
    contextMenu = [],
  }) => {
    const { setNodes, getNode } = useReactFlow();

    // Default actions
    const handleCopy = useCallback(() => {
      const node = getNode(id);
      if (node) {
        const newNode = {
          ...node,
          id: `${id}_copy_${Date.now()}`,
          position: { x: node.position.x + 25, y: node.position.y + 25 },
        };
        setNodes((nds) => [...nds, newNode]);
      }
    }, [id, getNode, setNodes]);

    const handleCut = useCallback(() => {
      handleCopy();
      setNodes((nds) => nds.filter((n) => n.id !== id));
    }, [handleCopy, id, setNodes]);

    const handleDelete = useCallback(() => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
    }, [id, setNodes]);

    const handleDuplicate = useCallback(() => {
      const node = getNode(id);
      if (node) {
        const newNode = {
          ...node,
          id: `${id}_dup_${Date.now()}`,
          position: { x: node.position.x + 40, y: node.position.y + 40 },
        };
        setNodes((nds) => [...nds, newNode]);
      }
    }, [id, getNode, setNodes]);

    // Combine default + custom context menu options
    const menuOptions = [
      {
        label: "Copy",
        icon: <ContentCopy fontSize="small" />,
        onClick: handleCopy,
      },
      {
        label: "Cut",
        icon: <ContentCut fontSize="small" />,
        onClick: handleCut,
      },
      {
        label: "Duplicate",
        icon: <FileCopy fontSize="small" />,
        onClick: handleDuplicate,
      },
      {
        label: "Delete",
        icon: <Delete fontSize="small" />,
        onClick: handleDelete,
      },
      { divider: true },
      ...contextMenu,
    ];

    // Context menu anchor
    const [anchorEl, setAnchorEl] = useState(null);
    const handleContextMenu = (event) => {
      event.preventDefault();
      setAnchorEl(event.currentTarget);
    };
    const handleCloseMenu = () => setAnchorEl(null);

    return (
      <Paper
        onContextMenu={handleContextMenu}
        elevation={selected ? 8 : 2}
        sx={{
          boxShadow: "none",
          minWidth: styles.minWidth || 200,
          minHeight: styles.minHeight || 100,
          borderRadius: styles.borderRadius || 2,
          p: 2,
          position: "relative",
          borderColor: selected
            ? "primary.main"
            : styles.borderColor || "divider",
          bgcolor: styles.bgColor || "background.paper",
          color: styles.color || "text.primary",
          transition: "all 0.2s ease",
          "&:hover": {
            bgcolor: styles.hoverBgColor || styles.bgColor || "action.hover",
            transform: "scale(1.02)",
            boxShadow: 4,
          },
          // Remove any background bleed
          overflow: "visible",
        }}
      >
        {/* Node title */}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            textAlign: "center",
            mb: properties.length > 0 ? 1 : 0,
          }}
        >
          {data?.ui?.label || "Node"}
        </Typography>

        {/* Properties */}
        {properties.length > 0 && (
          <Stack spacing={0.5}>
            {properties.map((prop, idx) => {
              if (prop.type === "string")
                return (
                  <Typography
                    key={`${prop.label}-${idx}`}
                    variant="caption"
                    color="text.secondary"
                  >
                    {prop.label}: {prop.value}
                  </Typography>
                );
              if (prop.type === "json")
                return (
                  <Typography
                    key={`${prop.label}-${idx}`}
                    variant="caption"
                    color="text.secondary"
                  >
                    {prop.label}: JSON value
                  </Typography>
                );
              return null;
            })}
          </Stack>
        )}

        {/* INPUT HANDLES */}
        {inputs.map((input, i) => (
          <Handle
            key={`in-${i}`}
            type="target"
            position={input.position || Position.Left}
            id={input.id || `in-${i}`}
            style={{
              background: input.color || "#10b981",
              top: input.top || `${((i + 1) / (inputs.length + 1)) * 100}%`,
              left: "-6px",
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
            }}
          />
        ))}

        {/* OUTPUT HANDLES */}
        {outputs.map((output, i) => (
          <Handle
            key={`out-${i}`}
            type="source"
            position={output.position || Position.Right}
            id={output.id || `out-${i}`}
            style={{
              background: output.color || "#3b82f6",
              top: output.top || `${((i + 1) / (outputs.length + 1)) * 100}%`,
              right: "-6px",
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
            }}
          />
        ))}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          onClick={handleCloseMenu}
        >
          {menuOptions.map((opt, idx) =>
            opt.divider ? (
              <Divider key={idx} />
            ) : (
              <MenuItem key={idx} onClick={opt.onClick}>
                {opt.icon && <ListItemIcon>{opt.icon}</ListItemIcon>}
                <ListItemText>{opt.label}</ListItemText>
              </MenuItem>
            )
          )}
        </Menu>
      </Paper>
    );
  }
);
