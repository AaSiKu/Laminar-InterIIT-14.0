import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const KPICard = ({ title, value, subtitle, icon: Icon, iconColor }) => {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: 'none',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '150px',
      }}
    >
      <Box>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            fontSize: '0.75rem',
            lineHeight: 1.2,
            minHeight: '32px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </Typography>
        {Icon && (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: iconColor ? `${iconColor}15` : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Icon sx={{ fontSize: 24, color: iconColor || 'text.secondary' }} />
          </Box>
        )}
        <Typography variant="h4" fontWeight="700" sx={{ mb: 0.5, fontSize: { xs: '1.75rem', md: '2rem' } }}>
          {value}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{
            fontSize: '0.7rem',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Paper>
  );
};

export default KPICard;

