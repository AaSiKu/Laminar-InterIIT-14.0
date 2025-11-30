import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import IconifyIcon from 'components/base/IconifyIcon';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const HighlightsPanel = ({ notifications }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [sortBy, setSortBy] = useState('all');

  const getIconStyle = (type) => {
    switch (type) {
      case 'success':
        return {
          color: 'success.dark',
          bgColor: 'success.lighter',
          icon: 'material-symbols:check-circle-outline',
          useIconify: true,
        };
      case 'error':
        return {
          color: 'error.dark',
          bgColor: 'error.lighter',
          icon: ErrorOutlineIcon,
          useIconify: false,
        };
      case 'warning':
        return {
          color: 'warning.dark',
          bgColor: 'warning.lighter',
          icon: WarningAmberIcon,
          useIconify: false,
        };
      case 'info':
      default:
        return {
          color: 'info.dark',
          bgColor: 'info.lighter',
          icon: 'material-symbols:info-outline',
          useIconify: true,
        };
    }
  };

  const getChipColor = (status) => {
    switch (status) {
      case 'Active':
        return 'info';
      case 'Deactivate':
        return 'error';
      default:
        return 'warning';
    }
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
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: '1.5rem' }}>
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
            {enhancedNotifications.map((notification, index) => {
              const iconStyle = getIconStyle(notification.type);
              const IconComponent = iconStyle.useIconify ? null : iconStyle.icon;
              return (
                <Box
                  key={notification.id}
                  sx={{
                    p: '1rem',
                    borderRadius: 2,
                    bgcolor: 'background.elevation1',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: '0.75rem' }}>
                    <Box
                      sx={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: 2,
                        bgcolor: iconStyle.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {iconStyle.useIconify ? (
                        <IconifyIcon icon={iconStyle.icon} sx={{ color: iconStyle.color, fontSize: 24 }} />
                      ) : (
                        <IconComponent sx={{ color: iconStyle.color, fontSize: 24 }} />
                      )}
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
                          color={getChipColor(notification.status)}
                          variant="soft"
                          size="small"
                        />
                      </Box>
                    )}
                  </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HighlightsPanel;

