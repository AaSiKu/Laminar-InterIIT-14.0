import { AppBar, Toolbar, Box, IconButton, Typography, Button, Menu, MenuItem, CircularProgress } from "@mui/material";
import { ArrowBack as ArrowBackIcon, Share as ShareIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const PipelineNavBar = ({
  onBackClick,
  pipelineName = "Pipeline A",
  loading,
  shareAnchorEl,
  onShareClick,
  onShareClose,
  onSave,
  onSpinup,
  onSpindown,
  onToggleStatus,
  currentPipelineStatus,
  currentPipelineId,
  containerId,
}) => {
  const theme = useTheme();

  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        padding: { xs: '8px 0', md: '8px 0' },
        borderColor: 'divider',
        bgcolor: 'background.elevation1',
        zIndex: 10,
        position: "relative",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          height: "48px",
          justifyContent: "space-between",
          px: 3,
          minHeight: "48px !important",
        }}
      >
        {/* Left Section - Logo and Pipeline Name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={onBackClick}
            sx={{
              color: "text.primary",
              "&:hover": { bgcolor: 'action.hover' },
              padding: "6px",
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <Typography
            variant="body1"
            sx={{
              color: "text.primary",
              fontWeight: 700,
              fontSize: "0.875rem",
              ml: 1,
            }}
          >
            {pipelineName}
          </Typography>
        </Box>

        {/* Right Section - Action Buttons */}
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          {loading && <CircularProgress size={18} />}

          <IconButton
            onClick={onShareClick}
            sx={{
              bgcolor: 'background.elevation1',
              color: "text.primary",
              "&:hover": { bgcolor: 'action.hover' },
              width: 32,
              height: 32,
              borderRadius: "6px",
            }}
          >
            <ShareIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Button
            variant="outlined"
            onClick={onSave}
            disabled={loading}
          >
            Save
          </Button>

          <Menu
            anchorEl={shareAnchorEl}
            open={Boolean(shareAnchorEl)}
            onClose={onShareClose}
          >
            <MenuItem onClick={onShareClose}>Share Link</MenuItem>
            <MenuItem onClick={onShareClose}>Export</MenuItem>
          </Menu>

          <Button
            variant="contained"
            onClick={onSpinup}
            disabled={loading || !currentPipelineId || !!containerId}
            sx={{
              bgcolor: 'background.elevation1',
              color: "text.primary",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              px: 2,
              py: 0.75,
              minHeight: "32px",
              borderRadius: "6px",
              boxShadow: "none",
              "&:hover": {
                bgcolor: 'action.hover',
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                bgcolor: 'action.disabledBackground',
                color: 'text.disabled',
              },
            }}
          >
            Spin Up
          </Button>

          <Button
            variant="contained"
            onClick={onSpindown}
            disabled={loading || !currentPipelineId || !containerId}
            sx={{
              bgcolor: 'background.elevation1',
              color: "text.primary",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              px: 2,
              py: 0.75,
              minHeight: "32px",
              borderRadius: "6px",
              boxShadow: "none",
              "&:hover": {
                bgcolor: 'action.hover',
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                bgcolor: 'action.disabledBackground',
                color: 'text.disabled',
              },
            }}
          >
            Spin Down
          </Button>

          <Button
            variant="contained"
            onClick={onToggleStatus}
            disabled={loading || !currentPipelineId || !containerId}
            sx={{
              bgcolor: 'background.elevation1',
              color: "text.primary",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              px: 2.5,
              py: 0.75,
              minHeight: "32px",
              borderRadius: "6px",
              boxShadow: "none",
              "&:hover": {
                bgcolor: 'action.hover',
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                bgcolor: 'action.disabledBackground',
                color: 'text.disabled',
              },
            }}
          >
            {currentPipelineStatus ? "Stop" : "Run"}
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default PipelineNavBar;

