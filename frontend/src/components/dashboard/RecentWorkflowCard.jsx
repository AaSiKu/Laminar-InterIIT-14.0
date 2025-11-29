import React from 'react';
import { Box, Typography, Avatar, AvatarGroup, Chip } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const RecentWorkflowCard = ({ workflow, onClick }) => {
  // Generate mock avatars based on workflow data with colors matching overview section
  const generateAvatars = (count = 4) => {
    const colors = ['#86C8BC', '#B4C7E7', '#F4C7AB', '#F0B4C4'];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
    }));
  };

  const avatars = generateAvatars();

  return (
    <Box
      sx={{
        p: '1.5rem',
        borderRadius: '0.75rem',
        border: '0.0625rem solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: '#f9fafb',
          boxShadow: '0 0.0625rem 0.1875rem rgba(0,0,0,0.1)',
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="body1" fontWeight="600" sx={{ mb: 0.5, fontSize: '1rem' }}>
          {workflow.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          Last Updated: {workflow.lastModified}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: '1.75rem', height: '1.75rem', fontSize: '0.75rem' } }}>
          {avatars.map((avatar) => (
            <Avatar key={avatar.id} sx={{ bgcolor: avatar.color, width: '1.75rem', height: '1.75rem' }}>
              {String.fromCharCode(65 + avatar.id)}
            </Avatar>
          ))}
        </AvatarGroup>

        <Chip
          label="Active"
          size="small"
          sx={{
            bgcolor: '#dcfce7',
            color: '#15803d',
            fontWeight: 600,
            fontSize: '0.75rem',
            height: '1.5rem',
          }}
        />

        <Box
          sx={{
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '0.375rem',
            border: '0.0625rem solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#f3f4f6' },
          }}
        >
          <MoreHorizIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
        </Box>
      </Box>
    </Box>
  );
};

export default RecentWorkflowCard;

