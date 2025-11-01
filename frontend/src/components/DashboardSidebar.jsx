import React, { useState } from 'react';
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
  Collapse
} from '@mui/material';
import { Close, KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';

const DashboardSidebar = ({ open, onClose, fileStructure }) => {
  const drawerWidth = 250;
  const [expanded, setExpanded] = useState({});

  const handleToggle = (path) => {
    setExpanded(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderFileTree = (items, level = 0, parentPath = '') => {
    return items.map((item, index) => {
      const currentPath = `${parentPath}/${item.name}`;
      const isExpanded = expanded[currentPath];
      const isFolder = item.type === 'folder';

      return (
        <React.Fragment key={currentPath}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => isFolder && handleToggle(currentPath)}
              sx={{
                pl: 2 + level * 2,
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              {isFolder && (
                isExpanded ? 
                  <KeyboardArrowDown sx={{ mr: 0.5, fontSize: 20 }} /> : 
                  <KeyboardArrowRight sx={{ mr: 0.5, fontSize: 20 }} />
              )}
              
              <ListItemText 
                primary={
                  <span>
                    {isFolder ? '📁 ' : '📄 '}
                    {item.name}
                  </span>
                }
                primaryTypographyProps={{
                  fontSize: '0.9rem'
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
      variant="persistent"
      anchor="left"
      open={open}
      transitionDuration={0}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        transition: 'none',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          left: 64,
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e0e0e0',
          transition: 'none',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
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
      
      <List>
        {fileStructure && renderFileTree(fileStructure)}
      </List>
    </Drawer>
  );
};

export default DashboardSidebar;