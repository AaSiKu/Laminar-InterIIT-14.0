import React, { useState } from 'react';
import { Box, Typography, Avatar, AvatarGroup, Chip, IconButton } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const RecentWorkflowCard = ({ workflow, onClick, selected }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  // Generate mock avatars based on workflow data using avatar service
  const generateAvatars = (count = 4) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `User${String.fromCharCode(65 + i)}`,
    }));
  };

  const avatars = generateAvatars();

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = (e) => {
    setIsPressed(false);
    if (onClick) onClick(e);
  };

  const isActive = selected || isPressed;

  return (
    <Box
      sx={{
        p: '1.5rem',
        borderRadius: '0.75rem',
        bgcolor: isActive ? 'action.selected' : 'background.elevation1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        '&:hover': {
          bgcolor: isActive ? 'action.selected' : 'action.hover',
        },
        '&:active': {
          bgcolor: 'action.selected',
        },
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
          {avatars.map((avatar) => {
            const avatarUrl = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(avatar.id)}&size=32`;
            return (
              <Avatar 
                key={avatar.id}
                src={avatarUrl}
                alt={avatar.name}
                sx={{ width: '1.75rem', height: '1.75rem' }}
              >
                {String.fromCharCode(65 + avatar.id)}
              </Avatar>
            );
          })}
        </AvatarGroup>

        <Chip
          label="Active"
          color="success"
          variant="soft"
          size="small"
        />

        <IconButton
          size="small"
          sx={{
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '0.375rem',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <MoreHorizIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default RecentWorkflowCard;

