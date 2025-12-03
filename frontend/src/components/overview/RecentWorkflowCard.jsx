import React, { useState } from 'react';
import { Box, Typography, Avatar, AvatarGroup, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);


const RecentWorkflowCard = ({ workflow, onClick, selected }) => {
  const theme = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  // Use theme colors for status
  const statusColors = {
    Running: theme.palette.success.main,
    Stopped: theme.palette.warning.main,
    Broken: theme.palette.error.main,
  };


  // Use theme colors for avatars
  const colors = [
    theme.palette.info.light,
    theme.palette.primary.light,
    theme.palette.warning.light,
    theme.palette.secondary.light,
  ];
  const avatars = (workflow.owners || []).map((owner, index) => ({
    id: owner.id,
    initials: owner.initials || owner.display_name.split(" ").map(x => x[0].toUpperCase()).slice(0,2).join(""),
    color: colors[index % colors.length]
  }));

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
        p: theme.spacing(3),
        borderRadius: theme.shape.borderRadius * 3,
        bgcolor: isActive ? 'action.selected' : 'background.elevation1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: theme.transitions.create('background-color', {
          duration: theme.transitions.duration.short,
        }),
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
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: theme.typography.body2.fontSize }}>
          Last Updated: {dayjs(workflow.user_pipeline_version.version_updated_at).fromNow()}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(2) }}>
      <AvatarGroup
        max={4} 
        sx={{
          '& .MuiAvatar-root': {
            width: theme.spacing(3.5),
            height: theme.spacing(3.5),
            fontSize: theme.typography.caption.fontSize
          }
        }}
      >
        {avatars.map((avatar) => (
          <Tooltip key={avatar.id} title={avatar.initials}>
            <Avatar sx={{ bgcolor: avatar.color, width: theme.spacing(3.5), height: theme.spacing(3.5) }}>
              {avatar.initials}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>

        <Chip
          label={workflow.status}
          variant="soft"
          size="small"
          sx={{
            backgroundColor: statusColors[workflow.status],
            color: theme.palette.common.white,
            fontWeight: 500,
          }}
        />

        <IconButton
          size="small"
          sx={{
            width: theme.spacing(3),
            height: theme.spacing(3),
            borderRadius: theme.shape.borderRadius * 1.5,
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

