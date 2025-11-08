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

const DashboardSidebar = ({
  open,
  onClose,
  fileStructure,
  nodes,
  setNodes,
  edges,
  setEdges,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const drawerWidth = 325;
  const [expanded, setExpanded] = useState({});

  const handleToggle = (path) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const renderFileTree = (items, level = 0, parentPath = "") => {
    return items.map((item, index) => {
      const currentPath = `${parentPath}/${item.name}`;
      const isExpanded = expanded[currentPath];
      const isFolder = item.type === "folder";
      const handleOnClick = () => {
        if (isFolder) handleToggle(currentPath);
        else return;
        loadFlowFromAPI(item.id,setNodes,setEdges)
      };
      return (
        <React.Fragment key={currentPath}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleOnClick}
              sx={{
                pl: 2 + level * 2,
                ml: isMobile ? 8 + level * 2 : 0,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
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
                  <span style={{ display: "flex", alignItems: "center" }}>
                    {!isFolder && (
                      <img
                        src={getFileIconUrl(item.name)}
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          marginRight: 8,
                          verticalAlign: "middle",
                        }}
                        onError={(e) => {
                          e.target.src =
                            "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons/icons/default_file.svg";
                        }}
                      />
                    )}

                    <Typography
                      sx={{
                        fontWeight: isFolder ? 600 : 400,
                        color: "secondary.main",
                      }}
                    >
                      {item.name}
                    </Typography>
                  </span>
                }
                primaryTypographyProps={{
                  fontSize: "0.9rem",
                }}
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
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "persistent"}
      anchor="left"
      open={open}
      onClose={onClose}
      transitionDuration={0}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        transition: "none",
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          left: isMobile ? 0 : 64,
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e0e0e0",
          transition: "none",
          zIndex: 1000,
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          height: "12vh",
          minHeight: 64,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Files
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      <Divider />

      <List>{fileStructure && renderFileTree(fileStructure)}</List>
    </Drawer>
  );
};

export default DashboardSidebar;

async function loadFlowFromAPI(fileId, setNodes, setEdges) {
  try {
    const flowData = await fetchFileData(fileId);

    if (flowData && flowData.nodes && flowData.edges) {
      setNodes(flowData.nodes);
      setEdges(flowData.edges);
      console.log("Flow loaded from API successfully");
    }
  } catch (error) {
    console.error("Error loading flow from API:", error);
  }
}

const getFileIconUrl = (filename) => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const baseUrl = "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons/icons";

  const iconMap = {
    js: `${baseUrl}/file_type_js.svg`,
    jsx: `${baseUrl}/file_type_reactjs.svg`,
    ts: `${baseUrl}/file_type_typescript.svg`,
    tsx: `${baseUrl}/file_type_reactts.svg`,
    html: `${baseUrl}/file_type_html.svg`,
    css: `${baseUrl}/file_type_css.svg`,
    scss: `${baseUrl}/file_type_scss.svg`,
    pdf: `${baseUrl}/file_type_pdf.svg`,
    doc: `${baseUrl}/file_type_word.svg`,
    docx: `${baseUrl}/file_type_word.svg`,
    txt: `${baseUrl}/file_type_text.svg`,
    md: `${baseUrl}/file_type_markdown.svg`,
    jpg: `${baseUrl}/file_type_image.svg`,
    jpeg: `${baseUrl}/file_type_image.svg`,
    png: `${baseUrl}/file_type_image.svg`,
    gif: `${baseUrl}/file_type_image.svg`,
    svg: `${baseUrl}/file_type_svg.svg`,
    json: `${baseUrl}/file_type_json.svg`,
    xml: `${baseUrl}/file_type_xml.svg`,
    csv: `${baseUrl}/file_type_excel.svg`,
    xlsx: `${baseUrl}/file_type_excel.svg`,
    yaml: `${baseUrl}/file_type_yaml.svg`,
    yml: `${baseUrl}/file_type_yaml.svg`,
    py: `${baseUrl}/file_type_python.svg`,
    java: `${baseUrl}/file_type_java.svg`,
    cpp: `${baseUrl}/file_type_cpp.svg`,
    c: `${baseUrl}/file_type_c.svg`,
    php: `${baseUrl}/file_type_php.svg`,
    rb: `${baseUrl}/file_type_ruby.svg`,
    go: `${baseUrl}/file_type_go.svg`,
    zip: `${baseUrl}/file_type_zip.svg`,
    rar: `${baseUrl}/file_type_zip.svg`,
  };

  return iconMap[ext] || `${baseUrl}/default_file.svg`;
};
