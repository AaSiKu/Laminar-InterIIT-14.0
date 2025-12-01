import { Box, Typography, Button } from "@mui/material";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import pipelineImage from "../../assets/image.png";

const PipelinePreview = ({ workflowId }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: 'background.paper', border: "1px solid", borderColor: 'divider', borderRadius: 0, p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "text.primary" }}>
          Pipeline
        </Typography>
        <Button
          variant="text"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/workflows/${workflowId}`)}
          sx={{
            textTransform: "none",
            color: "primary.main",
            fontSize: "0.8125rem",
            fontWeight: 500,
            minWidth: "auto",
            px: 1,
            py: 0.5,
            borderRadius: "4px",
            "&:hover": { 
              bgcolor: "rgba(25, 118, 210, 0.08)",
            },
          }}
        >
          Open
        </Button>
      </Box>
      <Box
        onClick={() => navigate(`/workflows/${workflowId}`)}
        sx={{
          height: 120,
          background: 'linear-gradient(to bottom, rgba(135, 206, 250, 0.02) 0%, rgba(135, 206, 250, 0.05) 50%, rgba(135, 206, 250, 0.15) 100%)',
          border: "1px solid",
          borderColor: 'divider',
          borderRadius: "4px",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative",
          "&:hover": {
            borderColor: "primary.main",
            background: 'linear-gradient(to bottom, rgba(135, 206, 250, 0.05) 0%, rgba(135, 206, 250, 0.1) 50%, rgba(135, 206, 250, 0.2) 100%)',
          },
        }}
      >
        <img 
          src={pipelineImage} 
          alt="Pipeline Preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
};

export default PipelinePreview;

