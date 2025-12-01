import { Box, Typography, Button, Paper, IconButton } from "@mui/material";
import { MoreHoriz as MoreHorizIcon } from "@mui/icons-material";

const ActionRequired = ({ actionFilter, onFilterChange, actionItems }) => {
  return (
    <Box 
      sx={{ 
        display: "flex",
        flexDirection: "column",
        bgcolor: 'background.paper',
        border: "1px solid",
        borderColor: 'divider',
        borderRadius: 0,
        borderTop: "none",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "text.primary" }}>
          Action Required
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          onClick={() => onFilterChange("critical")}
          sx={{
            textTransform: "none",
            bgcolor: actionFilter === "critical" ? 'action.selected' : "transparent",
            color: actionFilter === "critical" ? "primary.dark" : "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 500,
            px: 1.5,
            py: 0.5,
            minWidth: "auto",
            borderRadius: "4px",
            "&:hover": {
              bgcolor: actionFilter === "critical" ? 'action.selected' : 'action.hover',
            },
          }}
        >
          Critical
        </Button>
        <Button
          size="small"
          onClick={() => onFilterChange("low")}
          sx={{
            textTransform: "none",
            bgcolor: actionFilter === "low" ? 'action.selected' : "transparent",
            color: actionFilter === "low" ? "primary.dark" : "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 500,
            px: 1.5,
            py: 0.5,
            minWidth: "auto",
            borderRadius: "4px",
            "&:hover": {
              bgcolor: actionFilter === "low" ? 'action.selected' : 'action.hover',
            },
          }}
        >
          Low
        </Button>
      </Box>
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          p: 2,
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", mb: 1.5, display: "block", textTransform: "capitalize" }}>
          {actionFilter}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {actionItems.map((item, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: 'background.elevation1',
                border: "1px solid",
                borderColor: 'divider',
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "primary.main", bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "text.primary", flex: 1 }}>
                  {item.title}
                </Typography>
                <IconButton size="small" sx={{ ml: 1, p: 0.5 }}>
                  <MoreHorizIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </IconButton>
              </Box>
              {item.email && (
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                  {item.email}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block", mb: 1 }}>
                {item.assignee || item.time}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                <Button 
                  size="small" 
                  sx={{ 
                    textTransform: "none", 
                    color: "primary.main", 
                    fontSize: "0.75rem", 
                    fontWeight: 500,
                    minWidth: "auto",
                    p: 0,
                  }}
                >
                  Approve
                </Button>
                <Button 
                  size="small" 
                  sx={{ 
                    textTransform: "none", 
                    color: "error.main", 
                    fontSize: "0.75rem", 
                    fontWeight: 500,
                    minWidth: "auto",
                    p: 0,
                  }}
                >
                  Reject
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ActionRequired;

