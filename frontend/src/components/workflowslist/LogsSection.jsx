import { Box, Typography, IconButton } from "@mui/material";
import { KeyboardArrowRight as KeyboardArrowRightIcon } from "@mui/icons-material";

const LogsSection = ({ logs }) => {
  return (
    <Box 
      sx={{ 
        display: "flex",
        flexDirection: "column",
        bgcolor: 'background.paper',
        border: "1px solid",
        borderColor: 'divider',
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: 'divider', display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "text.primary" }}>
          Logs
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <KeyboardArrowRightIcon sx={{ fontSize: 18, transform: "rotate(180deg)" }} />
          </IconButton>
          <IconButton size="small" sx={{ color: "text.secondary" }}>
            <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: "auto", 
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {logs.map((log, index) => (
            <Box key={index} sx={{ display: "flex", gap: 1.5 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "4px",
                  bgcolor: 'background.elevation1',
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <Typography sx={{ fontSize: "0.75rem" }}>🔑</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "text.primary", mb: 0.5, lineHeight: 1.5 }}>
                  {log}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>
                  9:30 PM
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default LogsSection;

