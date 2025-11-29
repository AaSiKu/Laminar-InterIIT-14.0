import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const KPICard = ({ title, value, subtitle, icon: Icon, iconColor }) => {
  return (
    <Paper
      sx={{
        p: '1.5rem',
        borderRadius: '0.75rem',
        border: '0.0625rem solid #e5e7eb',
        boxShadow: 'none',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '9.375rem',
      }}
    >
      <Box sx={{ textAlign: 'left', width: '100%', maxWidth: '12rem' }}>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: '1rem',
            fontSize: '0.75rem',
            lineHeight: 1.2,
            minHeight: '2rem',
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
              width: '3rem',
              height: '3rem',
              borderRadius: '0.75rem',
              bgcolor: iconColor ? `${iconColor}15` : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: '1rem',
            }}
          >
            <Icon sx={{ fontSize: '1.5rem', color: iconColor || 'text.secondary' }} />
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

