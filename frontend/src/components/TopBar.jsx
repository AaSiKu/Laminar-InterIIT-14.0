import { useState } from 'react';
import { Box, TextField, InputAdornment, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Switch, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useColorScheme } from '@mui/material/styles';

const TopBar = ({ 
  showSearch = true, 
  userAvatar,
  searchPlaceholder = "Search",
  onLogout
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { mode, setMode } = useColorScheme();

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeToggle = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    handleClose();
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <Box
      className="overview-topbar"
      sx={{
        padding: { xs: '16px', md: '16px 32px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Left Section - Search */}
      {showSearch && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <TextField
            placeholder={searchPlaceholder}
            size="small"
            sx={{
              width: { xs: 150, sm: 250, md: 300 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'background.elevation1',
                '& fieldset': {
                  borderColor: 'divider',
                },
                '&:hover fieldset': {
                  borderColor: 'divider',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1.25rem', color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Right Section - User Avatar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Avatar with Dropdown Menu */}
          <Avatar
            src={userAvatar}
            alt="User"
          onClick={handleAvatarClick}
            sx={{
              width: 40,
              height: 40,
            bgcolor: userAvatar ? 'transparent' : 'primary.main',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            },
          }}
          aria-controls={open ? 'profile-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          {!userAvatar && 'U'}
        </Avatar>

        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: {
                mt: 1,
                minWidth: 180,
                borderRadius: 2,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                },
              },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              mx: 1,
              my: 0.5,
              borderRadius: 1,
              minWidth: 200,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DarkModeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                Dark Mode
              </Typography>
            </Box>
            <Switch
              checked={mode === 'dark'}
              onChange={handleThemeToggle}
              size="small"
              sx={{
                ml: 3,
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: 'primary.main',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: 'primary.main',
                },
              }}
            />
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default TopBar;

