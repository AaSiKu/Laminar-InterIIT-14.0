import { Box, Typography, Button, Paper, IconButton } from "@mui/material";
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';

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
          variant={actionFilter === "critical" ? "soft" : "text"}
          color="neutral"
          onClick={() => onFilterChange("critical")}
          sx={{
            minWidth: "auto",
            border: "none",
            '&:hover': {
              border: "none",
            },
          }}
        >
          Critical
        </Button>
        <Button
          size="small"
          variant={actionFilter === "low" ? "soft" : "text"}
          color="neutral"
          onClick={() => onFilterChange("low")}
          sx={{
            minWidth: "auto",
            border: "none",
            '&:hover': {
              border: "none",
            },
          }}
        >
          Low
        </Button>
        <Button
          size="small"
          variant={actionFilter === "history" ? "soft" : "text"}
          color="neutral"
          onClick={() => onFilterChange("history")}
          sx={{
            minWidth: "auto",
            border: "none",
            '&:hover': {
              border: "none",
            },
          }}
        >
          History
        </Button>
      </Box>
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          p: 2,
          pb: 3,
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
                bgcolor: 'rgba(25, 118, 210, 0.04)',
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": { bgcolor: 'rgba(25, 118, 210, 0.08)' },
                boxShadow: "none",
                border: '1px solid rgba(25, 118, 210, 0.12)',
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "text.primary", flex: 1 }}>
                  {item.title}
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    ml: 1, 
                    p: 0.5,
                    color: 'primary.main',
                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                    width: 28,
                    height: 28,
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.16)',
                    },
                  }}
                >
                  <AutoAwesomeOutlinedIcon sx={{ fontSize: 16 }} />
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
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button 
                  size="small"
                  variant="text"
                  sx={{ 
                    minWidth: "auto",
                    px: 0,
                    py: 0,
                    color: "primary.main",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    textTransform: "none",
                    '&:hover': {
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  Approve
                </Button>
                <Button 
                  size="small"
                  variant="text"
                  sx={{ 
                    minWidth: "auto",
                    px: 0,
                    py: 0,
                    color: "error.main",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    textTransform: "none",
                    '&:hover': {
                      bgcolor: 'transparent',
                    },
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

