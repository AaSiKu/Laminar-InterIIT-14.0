import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Divider,
  Collapse,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useMediaQuery, useTheme } from "@mui/material";
import { fetchFileData } from "../utils/dashboard.api";
import { useGlobalContext } from "../context/GlobalContext";

const DashboardSidebar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const drawerWidth = 325;
  const [expanded, setExpanded] = useState({});

  const {
    dashboardSidebarOpen: open,
    setDashboardSidebarOpen: onClose,
    fileStructure,
    setFileStructure,
    currentNodes: nodes,
    setCurrentNodes: setNodes,
    currentEdges: edges,
    setCurrentEdges: setEdges,
  } = useGlobalContext();

  const handleToggle = (path) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const renderFileTree = (items, level = 0, parentPath = "") =>
    items.map((item) => {
      const currentPath = `${parentPath}/${item.name}`;
      const isExpanded = expanded[currentPath];
      const isFolder = item.type === "folder";
      const handleOnClick = () => {
        if (isFolder) handleToggle(currentPath);
        else loadFlowFromAPI(item.id, setNodes, setEdges);
      };

      return (
        <React.Fragment key={currentPath}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleOnClick}
              sx={{
                pl: 2 + level * 2,
                ml: isMobile ? 8 + level * 2 : 0,
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
            >
              {isFolder &&
                (isExpanded ? (
                  <img
                    src="https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons/icons/default_folder_opened.svg"
                    alt=""
                    style={{ width: 20, height: 20, marginRight: 8 }}
                  />
                ) : (
                  <img
                    src="https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons/icons/default_folder.svg"
                    alt=""
                    style={{ width: 20, height: 20, marginRight: 8 }}
                  />
                ))}

              <ListItemText
                primary={
                  <Typography
                    sx={{
                      fontWeight: isFolder ? 600 : 400,
                      color: "secondary.main",
                    }}
                  >
                    {item.name}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>

          {isFolder && item.children && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {renderFileTree(item.children, level + 1, currentPath)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });

  return (
    <Drawer
      variant={isMobile ? "temporary" : "persistent"}
      anchor="left"
      open={open}
      onClose={() => onClose(false)}
      transitionDuration={0}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          height: "100vh",
          left: isMobile ? 0 : 64,
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e0e0e0",
          zIndex: 1000,
        },
      }}
      ModalProps={{ keepMounted: true }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Files
        </Typography>
        <IconButton onClick={() => onClose(false)} size="small">
          <Close />
        </IconButton>
      </Box>

      <Divider />
      <List>{fileStructure && renderFileTree(fileStructure)}</List>
    </Drawer>
  );
};

export default DashboardSidebar;
