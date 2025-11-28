import React from 'react';
import { Box, Typography, Button, Chip, IconButton } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const HighlightsPanel = ({ notifications }) => {
  const getNotificationIcon = (type) => {
    const iconMap = {
      success: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />,
      error: <ErrorOutlineIcon sx={{ fontSize: 20 }} />,
      warning: <WarningAmberIcon sx={{ fontSize: 20 }} />,
      info: <PeopleAltOutlinedIcon sx={{ fontSize: 20 }} />,
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

  // Use notifications as-is from API
  const enhancedNotifications = notifications;

  return (
    <Box
      sx={{
        height: '100%',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight="700">
            Highlights
          </Typography>
          <Button
            variant="text"
            size="small"
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
            endIcon={<ChevronLeftIcon sx={{ transform: 'rotate(180deg)' }} />}
          >
            Sort by
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {enhancedNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">No highlights to show</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {enhancedNotifications.map((notification, index) => (
              <Box
                key={notification.id}
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  bgcolor: '#fff',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#f9fafb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
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
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <IconButton size="small" sx={{ ml: 1, mt: -0.5 }}>
                        <MoreHorizIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {notification.timestamp}
                    </Typography>
                    {notification.status && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          label={notification.status === 'Active' ? 'Activate' : notification.status}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 20,
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

