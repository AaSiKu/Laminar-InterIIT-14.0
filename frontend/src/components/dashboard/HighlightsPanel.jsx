import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const HighlightsPanel = ({ notifications }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [sortBy, setSortBy] = useState('all');

  const getNotificationIcon = (type) => {
    const iconMap = {
      success: <CheckCircleOutlineIcon sx={{ fontSize: '1.25rem' }} />,
      error: <ErrorOutlineIcon sx={{ fontSize: '1.25rem' }} />,
      warning: <WarningAmberIcon sx={{ fontSize: '1.25rem' }} />,
      info: <PeopleAltOutlinedIcon sx={{ fontSize: '1.25rem' }} />,
    };
    return iconMap[type] || iconMap.info;
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };
    return colorMap[type] || colorMap.info;
  };

  // Define sort order priority for notification types
  const typePriority = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3,
  };

  const handleSortClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setAnchorEl(null);
  };

  const handleSortSelect = (sortOption) => {
    setSortBy(sortOption);
    handleSortClose();
  };

  // Sort notifications based on selected option
  const enhancedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) {
      return [];
    }

    let sorted = [...notifications];

    if (sortBy === 'all') {
      return sorted;
    }

    if (sortBy === 'type') {
      sorted.sort((a, b) => {
        const priorityA = typePriority[a.type] ?? 999;
        const priorityB = typePriority[b.type] ?? 999;
        return priorityA - priorityB;
      });
    } else if (typePriority[sortBy] !== undefined) {
      // Sort by specific type - show that type first
      sorted.sort((a, b) => {
        if (a.type === sortBy && b.type !== sortBy) return -1;
        if (a.type !== sortBy && b.type === sortBy) return 1;
        const priorityA = typePriority[a.type] ?? 999;
        const priorityB = typePriority[b.type] ?? 999;
        return priorityA - priorityB;
      });
    }

    return sorted;
  }, [notifications, sortBy]);

  return (
    <Box
      sx={{
        height: '100%',
        borderLeft: '0.0625rem solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: '1.5rem', borderBottom: '0.0625rem solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '0.5rem' }}>
          <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1.25rem' }}>
            Highlights
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={handleSortClick}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
            endIcon={<ArrowDropDownIcon />}
          >
            Sort by
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleSortClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem 
              onClick={() => handleSortSelect('all')}
              selected={sortBy === 'all'}
            >
              All
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortSelect('type')}
              selected={sortBy === 'type'}
            >
              Priority
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortSelect('error')}
              selected={sortBy === 'error'}
            >
              Error
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortSelect('warning')}
              selected={sortBy === 'warning'}
            >
              Warning
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortSelect('info')}
              selected={sortBy === 'info'}
            >
              Info
            </MenuItem>
            <MenuItem 
              onClick={() => handleSortSelect('success')}
              selected={sortBy === 'success'}
            >
              Success
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: '1rem' }}>
        {enhancedNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: '4rem' }}>
            <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>No highlights to show</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {enhancedNotifications.map((notification, index) => (
              <Box
                key={notification.id}
                sx={{
                  p: '1rem',
                  borderRadius: '0.75rem',
                  border: '0.0625rem solid #e5e7eb',
                  bgcolor: '#fff',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#f9fafb',
                    boxShadow: '0 0.0625rem 0.1875rem rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: '0.75rem' }}>
                  <Box
                    sx={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.625rem',
                      bgcolor: `${getNotificationColor(notification.type)}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: getNotificationColor(notification.type),
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '0.25rem' }}>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          flex: 1,
                          fontSize: '0.875rem',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <IconButton size="small" sx={{ ml: '0.5rem', mt: '-0.25rem' }}>
                        <MoreHorizIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: '0.5rem', fontSize: '0.75rem' }}>
                      {notification.timestamp}
                    </Typography>
                    {notification.status && (
                      <Box sx={{ display: 'flex', gap: '0.25rem' }}>
                        <Chip
                          label={notification.status === 'Active' ? 'Activate' : notification.status}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: '1.25rem',
                            bgcolor:
                              notification.status === 'Active'
                                ? '#dbeafe'
                                : notification.status === 'Deactivate'
                                ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              notification.status === 'Active'
                                ? '#1e40af'
                                : notification.status === 'Deactivate'
                                ? '#991b1b'
                                : '#92400e',
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HighlightsPanel;

