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
    { icon: <Notifications />, label: 'Notifications', path: '/notifications' },
    { icon: <Settings />, label: 'Settings', path: '/settings' },
    {
      icon: <img src="data:image/png;base64,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" alt="logout" style={{ width: 24, height: 24 }} />,
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 8px',
          height:"10vh",
          minHeight: 64,
        }}
      />
      
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