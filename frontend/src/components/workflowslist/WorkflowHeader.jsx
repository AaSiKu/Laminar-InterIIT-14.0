import { Box, Typography, Button, TextField, InputAdornment, IconButton, Tabs, Tab } from "@mui/material";
import { Search as SearchIcon, Add as AddIcon, FilterList as FilterListIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const WorkflowHeader = ({ searchQuery, onSearchChange, onAddNew, selectedTab, onTabChange }) => {
  const theme = useTheme();

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
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              px: 2,
              py: 0.5,
              fontWeight: 500,
              fontSize: "0.8125rem",
              boxShadow: "none",
              minWidth: "auto",
            }}
          >
            Add new
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem", mb: 2 }}>
          Recruitment involvement across roles
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: 'background.elevation1',
                borderRadius: "6px",
                fontSize: "0.8125rem",
                "& fieldset": { borderColor: 'divider' },
                "& input": { padding: "8px 12px" },
              },
            }}
          />
          <IconButton
            size="small"
            sx={{
              bgcolor: 'background.elevation1',
              border: "1px solid",
              borderColor: 'divider',
              borderRadius: "6px",
              "&:hover": { bgcolor: 'action.hover' },
            }}
          >
            <FilterListIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onChange={(e, newValue) => onTabChange(newValue)}
        sx={{
          mb: 0,
          minHeight: "36px",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.8125rem",
            color: "text.secondary",
            minHeight: "36px",
            py: 0.5,
            px: 2,
            "&.Mui-selected": { color: "text.primary" },
          },
          "& .MuiTabs-indicator": { bgcolor: "primary.main", height: "2px" },
        }}
      >
        <Tab label="My Projects" />
        <Tab label="Recent" />
        <Tab label="Drafts" />
      </Tabs>
    </Box>
  );
};

export default WorkflowHeader;

