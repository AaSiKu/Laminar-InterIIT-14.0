import { Box, TextField, InputAdornment, Avatar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ThemeToggler from './ThemeToggler';

const TopBar = ({ 
  showSearch = true, 
  showThemeToggle = true,
  userAvatar,
  searchPlaceholder = "Search"
}) => {
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

      {/* Right Section - Theme Toggle & User Avatar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {showThemeToggle && <ThemeToggler type="slim" />}
        {userAvatar ? (
          <Avatar
            src={userAvatar}
            alt="User"
            sx={{
              width: 40,
              height: 40,
            }}
          />
        ) : (
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
            }}
          >
            U
          </Avatar>
        )}
      </Box>
    </Box>
  );
};

export default TopBar;

