import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  Box,
  Divider
} from '@mui/material';
import {
  Home,
  Dashboard as DashboardIcon,
  People,
  Settings,
  BarChart,
  Notifications,
} from '@mui/icons-material';

const Sidebar = ({ setDashboardSidebarOpen, dashboardSidebarOpen }) => {
  const menuItems = [
    { icon: <Home />, label: 'Home' },
    { 
      icon: <DashboardIcon />, 
      label: 'Dashboard', 
      onClick: () => setDashboardSidebarOpen(!dashboardSidebarOpen)
    },
    { icon: <People />, label: 'Users' },
    { icon: <BarChart />, label: 'Analytics' },
    { icon: <Notifications />, label: 'Notifications' },
    { icon: <Settings />, label: 'Settings' },
  ];

  const collapsedWidth = 64;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsedWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          backgroundColor: '#ffffffff',
          borderRight: '1px solid #e0e0e0',
          zIndex:2000,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 8px',
          height:"12vh",
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
                  '&:hover': {
                    backgroundColor: '#e3f2fd',
                  },
                }}
                onClick={item.onClick}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 'auto',
                    justifyContent: 'center',
                    color: '#1976d2',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;