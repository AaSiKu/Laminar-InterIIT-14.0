import {useContext, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  Box,
  Divider,
} from '@mui/material';
import {
  Home,
  Dashboard as DashboardIcon,
  People,
  Settings,
  BarChart,
  Notifications,
  PowerSettingsNew,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useGlobalContext } from '../context/GlobalContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  const { setDashboardSidebarOpen, dashboardSidebarOpen, sidebarOpen, setSideBarOpen } = useGlobalContext();

   useEffect(() => {
    if (location.pathname === '/auth/login' || location.pathname === '/auth/signup') {
      setSideBarOpen(false);

      // If already logged in, redirect to home
      if (isAuthenticated) {
        navigate('/');
      }
    } else {
      setSideBarOpen(true);
    }
  }, [location.pathname, setSideBarOpen, isAuthenticated, navigate]);

  const menuItems = [
    { icon: <Home />, label: 'Home', path: '/' },
    { icon: <DashboardIcon />, label: 'Dashboard', path: '/dashboard', onClickExtra: () => setDashboardSidebarOpen(!dashboardSidebarOpen) },
    { icon: <People />, label: 'Users', path: '/users' },
    { icon: <BarChart />, label: 'Analytics', path: '/analytics' },
    { icon: <Notifications />, label: 'Notifications', path: '/developer-dashboard' },
    { icon: <Settings />, label: 'Settings', path: '/leadership' },
    {
      icon: <PowerSettingsNew color="error" />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  const collapsedWidth = 64;

  return sidebarOpen ? (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsedWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          backgroundColor: '#fff',
          borderRight: '1px solid #e0e0e0',
          zIndex: 2000,
        },
      }}
    >
      <Divider />
      
      <List>
        {menuItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <Tooltip title={item.label} placement="right" arrow>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: 'center',
                  px: 2.5,
                  '&:hover': { backgroundColor: '#e3f2fd' },
                }}
                onClick={() => {
                  if (!isAuthenticated && item.path !== '/') {
                    navigate('/auth/login');
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
                <ListItemIcon sx={{ minWidth: 0, mr: 'auto', justifyContent: 'center', color: '#1976d2' }}>
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </Drawer>
  ) : null;
};

export default Sidebar;