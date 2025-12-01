import { Box, Typography, Button, Paper } from "@mui/material";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const PipelinePreview = ({ workflowId }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: 'background.paper', border: "1px solid", borderColor: 'divider', borderRadius: "8px", p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "text.primary" }}>
          Pipeline
        </Typography>
        <Button
          variant="text"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate(`/workflows/${workflowId}`)}
          sx={{
            textTransform: "none",
            color: "primary.main",
            fontSize: "0.8125rem",
            fontWeight: 500,
            minWidth: "auto",
            p: 0,
            "&:hover": { bgcolor: "transparent" },
          }}
        >
          Open
        </Button>
      </Box>
      <Paper
        onClick={() => navigate(`/workflows/${workflowId}`)}
        sx={{
          height: 100,
          bgcolor: 'background.elevation1',
          border: "1px solid",
          borderColor: 'divider',
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: 'action.hover',
          },
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
          Click to view pipeline
        </Typography>
      </Paper>
    </Box>
  );
};

export default PipelinePreview;

