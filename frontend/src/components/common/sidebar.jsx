import { useContext, useEffect, useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  IconButton,
  Box,
  useTheme,
  drawerClasses,
} from "@mui/material";
import {
  AccountTreeRounded,
  TerminalRounded,
  WorkspacePremiumRounded,
  LogoutRounded,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useGlobalContext } from "../../context/GlobalContext";
import LogoExpanded from "../../assets/logoexp.svg";
import LogoCollapsed from "../../assets/logo.svg";
export const SIDEBAR_WIDTH = 64;
const DRAWER_WIDTH = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  const { sidebarOpen, setSideBarOpen } = useGlobalContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === "/login" || location.pathname === "/signup") {
      setSideBarOpen(false);
      if (isAuthenticated) {
        navigate("/");
      }
    } else {
      setSideBarOpen(true);
    }
  }, [location.pathname, setSideBarOpen, isAuthenticated, navigate]);

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const menuItems = [
    {
      icon: <TerminalRounded sx={{ fontSize: "1.5rem" }} />,
      label: "Overview",
      path: "/overview",
    },
    {
      icon: <AccountTreeRounded sx={{ fontSize: "1.5rem" }} />,
      label: "Workflows",
      path: "/workflows",
    },
    {
      icon: <WorkspacePremiumRounded sx={{ fontSize: "1.5rem" }} />,
      label: "Admin",
      path: "/admin",
    },
    {
      icon: <LogoutRounded color="error" sx={{ fontSize: "1.5rem" }} />,
      label: "Logout",
      onClick: logout,
    },
  ];

  if (!sidebarOpen) return null;

  const drawerWidth = drawerOpen ? DRAWER_WIDTH : SIDEBAR_WIDTH;

  return (
    <Drawer
      variant="permanent"
      open={drawerOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        transition: theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: drawerOpen
            ? theme.transitions.duration.enteringScreen
            : theme.transitions.duration.leavingScreen,
        }),
        [`& .${drawerClasses.paper}`]: {
          width: drawerWidth,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: drawerOpen
              ? theme.transitions.duration.enteringScreen
              : theme.transitions.duration.leavingScreen,
          }),
          overflow: "visible",
          position: "fixed",
          backgroundColor: drawerOpen
            ? "background.elevation1"
            : "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          zIndex: 2500,
          boxShadow: drawerOpen ? theme.shadows[4] : theme.shadows[1],
        },
      }}
    >
      {/* Header with logo */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing(1, drawerOpen ? 2.4 : 1),
          minHeight: 64,
        }}
      >
        <Box
          component="img"
          src={drawerOpen ? LogoExpanded : LogoCollapsed}
          alt="Logo"
          sx={{
            height: drawerOpen ? 24 : 32,
            width: "auto",
            objectFit: "contain",
            transition: theme.transitions.create(
              ["opacity", "transform", "height"],
              {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }
            ),
          }}
        />
      </Box>

      <List sx={{ flex: 1 }}>
        {menuItems.map((item, index) => {
          const isActive = item.path && location.pathname.startsWith(item.path);
          return (
            <ListItem key={index} disablePadding sx={{ display: "block" }}>
              <Tooltip
                title={item.label}
                placement="right"
                arrow
                disableHoverListener={drawerOpen}
              >
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerOpen ? "initial" : "center",
                    px: drawerOpen ? 3 : 2.5,
                    my: 0.5,
                    mx: 1,
                    borderRadius: 1,
                    backgroundColor: isActive
                      ? "action.selected"
                      : "transparent",
                    transition: theme.transitions.create(
                      ["background-color", "color"],
                      {
                        easing: theme.transitions.easing.easeInOut,
                        duration: theme.transitions.duration.short,
                      }
                    ),
                    "&:hover": {
                      backgroundColor: isActive
                        ? "action.hover"
                        : "action.hover",
                    },
                  }}
                  onClick={() => {
                    if (!isAuthenticated && item.path !== "/") {
                      navigate("/login");
                      return;
                    }

                    if (item.onClickExtra) item.onClickExtra();
                    if (item.onClick) {
                      item.onClick();
                      return;
                    }

                    if (item.path) navigate(item.path);
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: drawerOpen ? 3 : "auto",
                      justifyContent: "center",
                      color: isActive ? "primary.main" : "text.secondary",
                      transition: theme.transitions.create("color", {
                        easing: theme.transitions.easing.easeInOut,
                        duration: theme.transitions.duration.short,
                      }),
                      "& .MuiSvgIcon-root": {
                        fontSize: "1.5rem !important",
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      sx: {
                        color: isActive ? "primary.main" : "text.primary",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "0.875rem",
                        transition: theme.transitions.create(
                          ["color", "font-weight"],
                          {
                            easing: theme.transitions.easing.easeInOut,
                            duration: theme.transitions.duration.short,
                          }
                        ),
                      },
                    }}
                    sx={{
                      opacity: drawerOpen ? 1 : 0,
                      transition: theme.transitions.create("opacity", {
                        easing: theme.transitions.easing.sharp,
                        duration: drawerOpen
                          ? theme.transitions.duration.enteringScreen
                          : theme.transitions.duration.leavingScreen,
                      }),
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Toggle Arrow Button - positioned at middle right edge */}
      <IconButton
        onClick={drawerOpen ? handleDrawerClose : handleDrawerOpen}
        sx={{
          position: "absolute",
          right: -16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "50%",
          zIndex: 9999,
          "&:hover": {
            bgcolor: "action.hover",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1.25rem",
          },
        }}
      >
        {drawerOpen ? <ChevronLeft /> : <ChevronRight />}
      </IconButton>
    </Drawer>
  );
};

export default Sidebar;
