import { useContext, useEffect, useState } from 'react';
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
} from '@mui/material';
import {
  AccountTreeRounded,
  TerminalRounded,
  WorkspacePremiumRounded,
  LogoutRounded,
  Menu as MenuIcon,
  ChevronLeft,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useGlobalContext } from '../context/GlobalContext';
import Logo from '../assets/logo.svg';
export const SIDEBAR_WIDTH = 64;
const DRAWER_WIDTH = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  const { setDashboardSidebarOpen, dashboardSidebarOpen, sidebarOpen, setSideBarOpen } = useGlobalContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

   useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/signup') {
      setSideBarOpen(false);
      if (isAuthenticated) {
        navigate('/');
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
    { icon: <TerminalRounded />, label: 'Overview', path: '/overview' },
    {
      icon: <AccountTreeRounded />,
      label: 'Workflows',
      path: '/workflow',
      onClickExtra: () => setDashboardSidebarOpen(!dashboardSidebarOpen),
    },
    { icon: <WorkspacePremiumRounded />, label: 'Admin', path: '/admin' },
    {
      icon: <LogoutRounded color="error" />,
      label: 'Logout',
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
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: drawerOpen
            ? theme.transitions.duration.enteringScreen
            : theme.transitions.duration.leavingScreen,
        }),
        [`& .${drawerClasses.paper}`]: {
          width: drawerWidth,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: drawerOpen
              ? theme.transitions.duration.enteringScreen
              : theme.transitions.duration.leavingScreen,
          }),
          overflowX: 'hidden',
          position: 'fixed',
          backgroundColor: drawerOpen ? '#f8f9fa' : '#fff',
          borderRight: '1px solid #e0e0e0',
          zIndex: 2500,
          boxShadow: drawerOpen ? '4px 0 16px rgba(0,0,0,0.15)' : '1px 0 4px rgba(0,0,0,0.05)',
        },
      }}
    >
      {/* Header with logo and menu/close button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerOpen ? 'space-between' : 'center',
          padding: theme.spacing(1, 2.4),
          minHeight: 64,
          borderBottom: drawerOpen ? '1px solid #e0e0e0' : 'none',
        }}
      >
        {/* Logo - visible when expanded */}
        {drawerOpen && (
          <Box
            component="img"
            src={Logo}
            alt="Logo"
            sx={{
              height: 24,
              width: 'auto',
              objectFit: 'contain',
              transition: theme.transitions.create(['opacity', 'transform'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}
          />
        )}
        
        <IconButton 
          onClick={drawerOpen ? handleDrawerClose : handleDrawerOpen} 
          sx={{ 
            color: '#1976d2',
          }}
        >
          {drawerOpen ? <ChevronLeft /> : <MenuIcon />}
        </IconButton>
      </Box>

      <Divider />
        
        <List>
          {menuItems.map((item, index) => {
            const isActive = item.path && location.pathname.startsWith(item.path);
            return (
              <ListItem key={index} disablePadding sx={{ display: 'block' }}>
                <Tooltip 
                  title={item.label} 
                  placement="right" 
                  arrow
                  disableHoverListener={drawerOpen}
                >
                  <ListItemButton
                    sx={{
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: drawerOpen ? 3 : 2.5,
                      my: 0.5,
                      mx: 1,
                      borderRadius: 1,
                      backgroundColor: isActive ? '#e3f2fd' : 'transparent',
                      transition: theme.transitions.create(['background-color', 'color'], {
                        easing: theme.transitions.easing.easeInOut,
                        duration: theme.transitions.duration.short,
                      }),
                      '&:hover': { 
                        backgroundColor: isActive ? '#bbdefb' : '#f5f5f5',
                      },
                    }}
                    onClick={() => {
                      if (!isAuthenticated && item.path !== '/') {
                        navigate('/login');
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
                        mr: drawerOpen ? 3 : 'auto',
                        justifyContent: 'center',
                        color: isActive ? '#1976d2' : '#666',
                        transition: theme.transitions.create('color', {
                          easing: theme.transitions.easing.easeInOut,
                          duration: theme.transitions.duration.short,
                        }),
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        sx: {
                          color: isActive ? '#1976d2' : '#374151',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.875rem',
                          transition: theme.transitions.create(['color', 'font-weight'], {
                            easing: theme.transitions.easing.easeInOut,
                            duration: theme.transitions.duration.short,
                          }),
                        },
                      }}
                      sx={{
                        opacity: drawerOpen ? 1 : 0,
                        transition: theme.transitions.create('opacity', {
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
      </Drawer>
  );
};

export default Sidebar;