import { useState } from "react";
import { Box, Typography, Button, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Add as AddIcon, FilterListOutlined as FilterListOutlinedIcon, LoopOutlined as LoopOutlinedIcon, WarningAmberOutlined as WarningAmberOutlinedIcon, FlagOutlined as FlagOutlinedIcon, SaveOutlined as SaveOutlinedIcon } from "@mui/icons-material";

const WorkflowHeader = ({ onAddNew, selectedTab, onTabChange }) => {
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const filterOpen = Boolean(filterAnchorEl);

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterOption = (option) => {
    console.log("Filter option selected:", option);
    handleFilterClose();
  };

  return (
    <Box sx={{ flexShrink: 0, pb: 2, borderBottom: { xs: `1px solid`, lg: "none" }, borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", fontSize: "1.125rem" }}>
            Workflows
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={onAddNew}
          >
            Add new
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem", mb: 2, mt: 1 }}>
          Recruitment involvement across roles
        </Typography>
      </Box>

      {/* Filter */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
        <IconButton
          onClick={handleFilterClick}
          sx={{
            bgcolor: 'background.elevation1',
            borderRadius: "8px",
            width: 36,
            height: 36,
            "&:hover": { bgcolor: 'action.hover' },
          }}
        >
          <FilterListOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
        </IconButton>

        <Menu
          anchorEl={filterAnchorEl}
          open={filterOpen}
          onClose={handleFilterClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: 2,
                border: "1px solid",
                borderColor: 'divider',
              },
            },
          }}
        >
          <MenuItem onClick={() => handleFilterOption("inProgress")} sx={{ py: 1.5 }}>
            <ListItemIcon sx={{ mr: 2 }}>
              <Box sx={{ 
                bgcolor: 'background.elevation1', 
                borderRadius: '6px', 
                width: 32, 
                height: 32, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <LoopOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </Box>
            </ListItemIcon>
            <ListItemText>In Progress</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterOption("critical")} sx={{ py: 1.5 }}>
            <ListItemIcon sx={{ mr: 2 }}>
              <Box sx={{ 
                bgcolor: 'background.elevation1', 
                borderRadius: '6px', 
                width: 32, 
                height: 32, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </Box>
            </ListItemIcon>
            <ListItemText>Critical</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterOption("flagged")} sx={{ py: 1.5 }}>
            <ListItemIcon sx={{ mr: 2 }}>
              <Box sx={{ 
                bgcolor: 'background.elevation1', 
                borderRadius: '6px', 
                width: 32, 
                height: 32, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <FlagOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </Box>
            </ListItemIcon>
            <ListItemText>Flagged</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterOption("save")} sx={{ py: 1.5 }}>
            <ListItemIcon sx={{ mr: 2 }}>
              <Box sx={{ 
                bgcolor: 'background.elevation1', 
                borderRadius: '6px', 
                width: 32, 
                height: 32, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <SaveOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </Box>
            </ListItemIcon>
            <ListItemText>Save</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default WorkflowHeader;

