import { useState } from "react";
import { Box, Typography, Button, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Add as AddIcon, FilterList as FilterListIcon, Loop as LoopIcon, Warning as WarningIcon, Flag as FlagIcon, Save as SaveIcon } from "@mui/icons-material";

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
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={onAddNew}
          >
            Add new
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem", mb: 2 }}>
          Recruitment involvement across roles
        </Typography>
      </Box>

      {/* Tabs and Filter */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant={selectedTab === 0 ? "soft" : "text"}
            color={selectedTab === 0 ? "primary" : "neutral"}
            onClick={() => onTabChange(null, 0)}
            sx={{
              minWidth: "auto",
            }}
          >
            My Projects
          </Button>
          <Button
            variant={selectedTab === 1 ? "soft" : "text"}
            color={selectedTab === 1 ? "primary" : "neutral"}
            onClick={() => onTabChange(null, 1)}
            sx={{
              minWidth: "auto",
            }}
          >
            Recent
          </Button>
          <Button
            variant={selectedTab === 2 ? "soft" : "text"}
            color={selectedTab === 2 ? "primary" : "neutral"}
            onClick={() => onTabChange(null, 2)}
            sx={{
              minWidth: "auto",
            }}
          >
            Drafts
          </Button>
        </Box>

        <IconButton
          onClick={handleFilterClick}
          sx={{
            border: "1px solid",
            borderColor: 'divider',
            borderRadius: "6px",
            width: 36,
            height: 36,
            "&:hover": { bgcolor: 'action.hover' },
          }}
        >
          <FilterListIcon sx={{ fontSize: 20, color: "text.secondary" }} />
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
          <MenuItem onClick={() => handleFilterOption("inProgress")}>
            <ListItemIcon>
              <LoopIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>In Progress</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterOption("critical")}>
            <ListItemIcon>
              <WarningIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>Critical</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterOption("flagged")}>
            <ListItemIcon>
              <FlagIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>Flagged</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterOption("save")}>
            <ListItemIcon>
              <SaveIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText>Save</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default WorkflowHeader;

