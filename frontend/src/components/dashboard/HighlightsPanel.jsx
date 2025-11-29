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

  // Use notifications as-is from API
  const enhancedNotifications = notifications;

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

