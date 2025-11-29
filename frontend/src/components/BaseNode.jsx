import React, { memo, useState, useCallback, useRef, useEffect } from "react";
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
import NodeDataTable from "./NodeDataTable";
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
    
    // Hover state for property tooltips
    const [hoveredProp, setHoveredProp] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const hoverTimeoutRef = useRef(null);
    
    // Hover state for data table
    const [showDataTable, setShowDataTable] = useState(false);
    const dataTableTimeoutRef = useRef(null);
    const hideTableTimeoutRef = useRef(null);
    const nodeRef = useRef(null);

    // Property hover handlers
    const handlePropertyMouseEnter = (propKey, propValue) => {
      setHoveredProp({ key: propKey, value: propValue });
      
      // Show tooltip after 0.5 seconds
      hoverTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
    };

    const handlePropertyMouseLeave = () => {
      // Clear timeout if mouse leaves before 2 seconds
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setShowTooltip(false);
      setHoveredProp(null);
    };

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

    // Data table hover handlers
    const handleNodeMouseEnter = () => {
      setIsHovered(true);
      
      // Clear any pending hide timeout
      if (hideTableTimeoutRef.current) {
        clearTimeout(hideTableTimeoutRef.current);
        hideTableTimeoutRef.current = null;
      }
      
      // Only set show timeout if table is not already visible
      if (!showDataTable && !dataTableTimeoutRef.current) {
        // Show data table after 800ms hover
        dataTableTimeoutRef.current = setTimeout(() => {
          setShowDataTable(true);
          dataTableTimeoutRef.current = null;
        }, 800);
      }
    };

    const handleNodeMouseLeave = () => {
      setIsHovered(false);
      
      // Clear show timeout if mouse leaves before table appears
      if (dataTableTimeoutRef.current) {
        clearTimeout(dataTableTimeoutRef.current);
        dataTableTimeoutRef.current = null;
      }
      
      // Only start hide timeout if not already pending
      if (!hideTableTimeoutRef.current) {
        // Hide data table after 500ms delay
        hideTableTimeoutRef.current = setTimeout(() => {
          setShowDataTable(false);
          hideTableTimeoutRef.current = null;
        }, 500);
      }
    };

    // Handler for when mouse enters the data table
    const handleTableMouseEnter = () => {
      // Clear any pending hide timeout when mouse enters table
      if (hideTableTimeoutRef.current) {
        clearTimeout(hideTableTimeoutRef.current);
        hideTableTimeoutRef.current = null;
      }
      
      // Clear any pending show timeout
      if (dataTableTimeoutRef.current) {
        clearTimeout(dataTableTimeoutRef.current);
        dataTableTimeoutRef.current = null;
      }
      
      // Ensure table remains visible
      setShowDataTable(true);
    };

    // Handler for when mouse leaves the data table
    const handleTableMouseLeave = () => {
      // Only start hide timeout if not already pending
      if (!hideTableTimeoutRef.current) {
        // Hide table after 500ms when mouse leaves table
        hideTableTimeoutRef.current = setTimeout(() => {
          setShowDataTable(false);
          hideTableTimeoutRef.current = null;
        }, 500);
      }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        if (dataTableTimeoutRef.current) {
          clearTimeout(dataTableTimeoutRef.current);
        }
        if (hideTableTimeoutRef.current) {
          clearTimeout(hideTableTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={nodeRef}
        className="base-node-wrapper"
        onMouseEnter={handleNodeMouseEnter}
        onMouseLeave={handleNodeMouseLeave}
        style={{ position: 'relative' }}
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
        {/* Node Header (Colored) - Icon + Title */}
        <div className="base-node-header" style={{
          backgroundColor: styles.bgColor || "#e0e0e0"
        }}>
          <div className="base-node-header-left">
            <div className="base-node-indicator-dot">
              <Extension sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.9)' }} />
            </div>
            <Typography variant="subtitle2" className="base-node-title-in-header">
              {data?.ui?.label || "Node"}
            </Typography>
          </div>
        </div>

        {/* Node Body (White) - Properties Only */}
        <div className="base-node-body">
          {/* Properties */}
          {displayProps.length > 0 ? (
            <div className="base-node-properties">
              {displayProps.map((prop, idx) => {
                const propKey = `${prop.label}-${idx}`;
                const isHoveredProp = hoveredProp?.key === propKey && showTooltip;
                
                // Check if property value is empty
                const isEmpty = !prop.value || 
                               prop.value === '' || 
                               prop.value === 'null' || 
                               prop.value === 'undefined';
                
                const displayValue = isEmpty ? 'Not assigned' : 
                                    (prop.type === "json" ? "JSON" : prop.value);
                
                return (
                  <div key={propKey} className="base-node-property-row">
                    <Typography variant="caption" className="base-node-property-label">
                      {prop.label}
                    </Typography>
                    <div 
                      className="base-node-property-value"
                      onMouseEnter={() => handlePropertyMouseEnter(propKey, prop.value)}
                      onMouseLeave={handlePropertyMouseLeave}
                      style={{ position: 'relative' }}
                    >
                      <div 
                        className="base-node-property-value-text"
                        style={{ 
                          color: isEmpty ? '#9e9e9e' : 'inherit',
                          fontStyle: isEmpty ? 'italic' : 'normal'
                        }}
                      >
                        {displayValue}
                      </div>
                      
                      {/* Delayed Tooltip */}
                      {isHoveredProp && !isEmpty && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '8px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            maxWidth: '300px',
                            wordBreak: 'break-word',
                            zIndex: 10000,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            animation: 'fadeIn 0.2s ease-in',
                            pointerEvents: 'none',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {prop.type === "json" ? prop.value : prop.value}
                        </Box>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#9e9e9e',
                fontStyle: 'italic',
                textAlign: 'left',
                display: 'block',
                fontSize: '0.75rem'
              }}
            >
              Click to add properties
            </Typography>
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
      
      {/* Node Data Table - shown on hover */}
      <NodeDataTable 
        nodeId={id} 
        isVisible={showDataTable}
        nodeRef={nodeRef}
        onMouseEnter={handleTableMouseEnter}
        onMouseLeave={handleTableMouseLeave}
      />
      </div>
    );
  }
);
