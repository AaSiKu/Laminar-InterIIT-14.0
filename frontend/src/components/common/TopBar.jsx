import { useState, useContext } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  Typography,
  styled,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useColorScheme } from "@mui/material/styles";
import { AuthContext } from "../../context/AuthContext";

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const TopBar = ({
  showSearch = true,
  userAvatar,
  searchPlaceholder = "Search",
  onLogout,
  searchValue = "",
  onSearchChange,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { mode, setMode } = useColorScheme();
  const { logout: authLogout, user } = useContext(AuthContext);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeToggle = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    handleClose();
    if (onLogout) {
      onLogout();
    } else if (authLogout) {
      authLogout();
    }
  };

  // Generate avatar URL from the service
  const getAvatarUrl = () => {
    // Always use avatar service with a unique identifier (user ID or name)
    const identifier = user?.id || user?.name || userAvatar || "default";
    return `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(
      identifier
    )}&size=32`;
  };

  return (
    <Box
      className="overview-topbar"
      sx={{
        padding: { xs: "8px 16px", md: "8px 24px" },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Left Section - Search */}
      {showSearch && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
           
          }}
        >
          <TextField
            placeholder={searchPlaceholder}
            size="small"
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            sx={{
              minWidth: { xs: 150, sm: 200, md: 280 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '50px',
                bgcolor: 'background.elevation1',
                height: '28px',
                '& fieldset': {
                  borderColor: 'divider',
                },
                "&:hover fieldset": {
                  borderColor: "divider",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
              "& .MuiInputBase-input": {
                padding: "4px 12px",
                fontSize: "0.75rem",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Right Section - User Avatar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* Avatar with Dropdown Menu */}
        <StyledBadge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          variant="dot"
        >
          <Avatar
            src={getAvatarUrl()}
            alt={user?.name || "User"}
            onClick={handleAvatarClick}
            sx={{
              width: 28,
              height: 28,
              bgcolor: "primary.main",
              cursor: "pointer",
              fontSize: "0.75rem",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              },
            }}
            aria-controls={open ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            {!userAvatar &&
              !user?.id &&
              !user?.name &&
              (user?.name?.[0]?.toUpperCase() || "U")}
          </Avatar>
        </StyledBadge>

        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: {
                mt: 1,
                minWidth: 180,
                borderRadius: 2,
                "& .MuiMenuItem-root": {
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
              mx: 1,
              my: 0.5,
              borderRadius: 1,
              minWidth: 200,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {mode === "dark" ? (
                <DarkModeIcon
                  fontSize="small"
                  sx={{ color: "text.secondary" }}
                />
              ) : (
                <LightModeIcon
                  fontSize="small"
                  sx={{ color: "text.secondary" }}
                />
              )}
              <Typography variant="body2" sx={{ color: "text.primary" }}>
                Dark Mode
              </Typography>
            </Box>
            <Switch
              checked={mode === "dark"}
              onChange={handleThemeToggle}
              size="small"
              sx={{
                ml: 3,
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: "primary.main",
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "primary.main",
                },
              }}
            />
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default TopBar;
