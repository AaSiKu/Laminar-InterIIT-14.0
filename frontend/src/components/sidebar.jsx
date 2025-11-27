import { useContext, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  AccountTreeRounded,
  QueryStatsRounded,
  TerminalRounded,
  WorkspacePremiumRounded,
  LogoutRounded,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useGlobalContext } from '../context/GlobalContext';

export const SIDEBAR_WIDTH = 64;

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  const { setDashboardSidebarOpen, dashboardSidebarOpen, sidebarOpen, setSideBarOpen } = useGlobalContext();

   useEffect(() => {
    if (location.pathname === '/auth/login' || location.pathname === '/auth/signup') {
      setSideBarOpen(false);
      if (isAuthenticated) {
        navigate('/');
      }
    } else {
      setSideBarOpen(true);
    }
  }, [location.pathname, setSideBarOpen, isAuthenticated, navigate]);

  const menuItems = [
    { icon: <TerminalRounded />, label: 'Developer Hub', path: '/developer-dashboard' },
    {
      icon: <AccountTreeRounded />,
      label: 'Pipelines',
      path: '/dashboard',
      onClickExtra: () => setDashboardSidebarOpen(!dashboardSidebarOpen),
    },
    { icon: <WorkspacePremiumRounded />, label: 'Admin Dashboard', path: '/leadership' },
    { icon: <QueryStatsRounded />, label: 'Analytics', path: '/analytics' },
    {
      icon: <LogoutRounded color="error" />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return sidebarOpen ? (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
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