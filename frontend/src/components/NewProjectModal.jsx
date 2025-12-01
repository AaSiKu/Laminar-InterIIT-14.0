import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import "../css/newprojectmodal.css";

// Template data
const templates = {
  blank: [
    {
      id: "blank",
      name: "Blank",
      image: null,
      bgColor: "#e8f4f8",
    },
  ],
  sla: [
    {
      id: "mdtr-throughput",
      name: "MDTR & Throughput",
      image: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=300&fit=crop",
      bgColor: "#1a1a1a",
    },
    {
      id: "latency-check",
      name: "Latency Check",
      image: null,
      bgColor: "#b8d4d4",
    },
    {
      id: "crash-reports",
      name: "Crash Reports",
      image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=300&fit=crop",
      bgColor: "#f0f0f0",
    },
  ],
};

const NewProjectModal = ({ open, onClose, onSelectTemplate }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleTemplateClick = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    onClose();
  };

  const filterTemplates = (templateList) => {
    if (!searchQuery) return templateList;
    return templateList.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "0.75rem",
          maxHeight: "80vh",
        },
      }}
    >
      <Box className="new-project-header">
        <Typography className="new-project-title">New Project</Typography>
        <IconButton onClick={onClose} className="new-project-close-btn">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent className="new-project-content">
        {/* Search and Filter */}
        <Box className="new-project-search-row">
          <TextField
            placeholder="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="new-project-search"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9ca3af", fontSize: "1.25rem" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="text"
            startIcon={<FilterListIcon />}
            className="new-project-filter-btn"
          >
            Filter
          </Button>
        </Box>

        {/* Blank Template Section */}
        <Box className="new-project-section">
          <Box className="new-project-templates-grid">
            {filterTemplates(templates.blank).map((template) => (
              <Box
                key={template.id}
                className="new-project-template-card"
                onClick={() => handleTemplateClick(template)}
              >
                <Box
                  className="new-project-template-preview"
                  sx={{ backgroundColor: template.bgColor }}
                >
                  {template.image && (
                    <img
                      src={template.image}
                      alt={template.name}
                      className="new-project-template-image"
                    />
                  )}
                </Box>
                <Typography className="new-project-template-name">
                  {template.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* SLA Section */}
        <Box className="new-project-section">
          <Typography className="new-project-section-title">SLA</Typography>
          <Box className="new-project-templates-grid sla-grid">
            {filterTemplates(templates.sla).map((template) => (
              <Box
                key={template.id}
                className="new-project-template-card"
                onClick={() => handleTemplateClick(template)}
              >
                <Box
                  className="new-project-template-preview"
                  sx={{ backgroundColor: template.bgColor }}
                >
                  {template.image && (
                    <img
                      src={template.image}
                      alt={template.name}
                      className="new-project-template-image"
                    />
                  )}
                </Box>
                <Typography className="new-project-template-name">
                  {template.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;

