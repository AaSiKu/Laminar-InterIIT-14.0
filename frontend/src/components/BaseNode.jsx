import React, { memo, useState, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import {
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import { ContentCopy, ContentCut, Delete, FileCopy, Extension } from "@mui/icons-material";
import "../css/BaseNode.css";

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

    // Convert properties to array and get top 3
    const getDisplayProperties = () => {
      // If properties is already an array, use it
      if (Array.isArray(properties)) {
        return properties.slice(0, 3);
      }
      
      // If properties is an object (from data.properties), convert to array
      if (properties && typeof properties === 'object') {
        const propsArray = Object.entries(properties)
          .filter(([key, value]) => 
            key !== 'node_id' && 
            key !== 'category' && 
            key !== 'n_inputs' &&
            value !== null &&
            value !== undefined
          )
          .map(([key, value]) => ({
            label: key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            type: typeof value === 'object' ? 'json' : 'string'
          }));
        return propsArray.slice(0, 3);
      }
      
      return [];
    };

    const displayProps = getDisplayProperties();

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

    // Hover state for floating actions
    const [isHovered, setIsHovered] = useState(false);

    // Action buttons configuration
    const actionButtons = [
      {
        label: "Copy",
        icon: <ContentCopy />,
        onClick: handleCopy,
      },
      {
        label: "Cut",
        icon: <ContentCut />,
        onClick: handleCut,
      },
      {
        label: "Duplicate",
        icon: <FileCopy />,
        onClick: handleDuplicate,
      },
      {
        label: "Delete",
        icon: <Delete />,
        onClick: handleDelete,
      },
    ];

    return (
      <div
        className="base-node-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Extended Action Bar */}
        {isHovered && (
          <div className="base-node-action-bar">
            {actionButtons.map((action, idx) => (
              <Tooltip key={idx} title={action.label} arrow placement="top">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className="base-node-action-btn"
                >
                  {action.icon}
                </IconButton>
              </Tooltip>
            ))}
          </div>
        )}

        <Paper
          elevation={0}
          className={`base-node-paper ${selected ? 'selected' : ''}`}
          sx={{
            minWidth: styles.minWidth || 200,
            minHeight: styles.minHeight || 100,
            border: selected ? `2px solid ${styles.borderColor || "#1976d2"}` : `1px solid #e0e0e0`,
          }}
        >
        {/* Node Header (Colored) - Icon Only */}
        <div className="base-node-header" style={{
          backgroundColor: styles.bgColor || "#e0e0e0"
        }}>
          <div className="base-node-indicator-dot">
            <Extension sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.9)' }} />
          </div>
        </div>

        {/* Node Body (White) - Title + Properties */}
        <div className="base-node-body">
          {/* Node Title */}
          <Typography variant="subtitle2" className="base-node-title">
            {data?.ui?.label || "Node"}
          </Typography>
          
          {/* Properties */}
          {displayProps.length > 0 && (
            <div className="base-node-properties">
              {displayProps.map((prop, idx) => (
                <div key={`${prop.label}-${idx}`} className="base-node-property-row">
                  <Typography variant="caption" className="base-node-property-label">
                    {prop.label}
                  </Typography>
                  <div className="base-node-property-value">
                    {prop.type === "json" ? "JSON" : prop.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INPUT HANDLES */}
        {inputs.map((input, i) => (
          <Handle
            key={`in-${i}`}
            type="target"
            position={input.position || Position.Left}
            id={input.id || `in-${i}`}
            style={{
              background: "#fff",
              top: input.top || `${((i + 1) / (inputs.length + 1)) * 100}%`,
              left: "-5px",
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: "2px solid #9e9e9e",
              boxShadow: "none",
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
              background: "#fff",
              top: output.top || `${((i + 1) / (outputs.length + 1)) * 100}%`,
              right: "-5px",
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: "2px solid #9e9e9e",
              boxShadow: "none",
            }}
          />
        ))}
      </Paper>
      </div>
    );
  }
);
