import { useState } from "react";
import { Box, Typography, TextField, MenuItem, Select, FormControl, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const AGENT_OPTIONS = [
  { value: "a", label: "a" },
  { value: "b", label: "b" },
  { value: "c", label: "c" },
  { value: "d", label: "d" },
];

const AddAIAgent = ({ formData, onInputChange, onSelectChange }) => {
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState({
    name: "",
    description: "",
    agent: "",
  });

  const handleFieldChange = (field) => (event) => {
    const newValue = event.target.value;
    setCurrentAgent((prev) => ({
      ...prev,
      [field]: newValue,
    }));
  };

  const handleSelectChangeLocal = (field) => (event) => {
    const newValue = event.target.value;
    setCurrentAgent((prev) => ({
      ...prev,
      [field]: newValue,
    }));
  };

  const handleAddAgent = () => {
    if (currentAgent.name && currentAgent.description && currentAgent.agent) {
      setAgents((prev) => [...prev, { ...currentAgent }]);
      
      // Clear current agent form
      setCurrentAgent({
        name: "",
        description: "",
        agent: "",
      });
    }
  };

  const isFormComplete = currentAgent.name && currentAgent.description && currentAgent.agent;

  // Render agent form section
  const renderAgentForm = (agentData, index, isEditable = false, showLabel = true) => (
    <Box
      key={index}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        p: 0,
        mb: 2.5,
      }}
    >
      {showLabel && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "text.primary",
            mb: -1,
            textAlign: "right",
            fontSize: "1.25rem",
          }}
        >
          Agent {index}
        </Typography>
      )}

      {/* Name Field */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Name
        </Typography>
        {isEditable ? (
          <TextField
            fullWidth
            placeholder="Name"
            value={agentData.name}
            onChange={handleFieldChange("name")}
            variant="filled"
            disabled={false}
            required
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              pointerEvents: "auto !important",
              "& .MuiFilledInput-root": {
                pointerEvents: "auto !important",
                bgcolor: "background.elevation2",
                borderRadius: 2,
                "&:hover": { bgcolor: "background.elevation1" },
                "&.Mui-focused": {
                  bgcolor: "background.elevation1",
                  boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                },
              },
              "& .MuiFilledInput-input": {
                py: 1.5,
                px: 2,
                fontSize: "0.875rem",
                pointerEvents: "auto !important",
                "&::placeholder": { color: "text.secondary", opacity: 1 },
              },
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              py: 1.5,
              px: 2,
              bgcolor: "background.elevation2",
              borderRadius: 2,
            }}
          >
            {agentData.name}
          </Typography>
        )}
      </Box>

      {/* Description Field */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Description
        </Typography>
        {isEditable ? (
          <TextField
            fullWidth
            placeholder="Description"
            value={agentData.description}
            onChange={handleFieldChange("description")}
            variant="filled"
            multiline
            rows={4}
            disabled={false}
            required
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              pointerEvents: "auto !important",
              "& .MuiFilledInput-root": {
                pointerEvents: "auto !important",
                bgcolor: "background.elevation2",
                borderRadius: 2,
                "&:hover": { bgcolor: "background.elevation1" },
                "&.Mui-focused": {
                  bgcolor: "background.elevation1",
                  boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                },
              },
              "& .MuiFilledInput-input": {
                py: 1,
                px: 1.5,
                fontSize: "0.875rem",
                pointerEvents: "auto !important",
                "&::placeholder": { color: "text.secondary", opacity: 1 },
              },
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              py: 1.5,
              px: 2,
              bgcolor: "background.elevation2",
              borderRadius: 2,
              whiteSpace: "pre-wrap",
            }}
          >
            {agentData.description}
          </Typography>
        )}
      </Box>

      {/* Agent Selection Dropdown */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          component="label"
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Agent
        </Typography>
        {isEditable ? (
          <FormControl
            fullWidth
            variant="filled"
            sx={{
              pointerEvents: "auto !important",
              "& .MuiFilledInput-root": {
                pointerEvents: "auto !important",
                bgcolor: "background.elevation2",
                borderRadius: 2,
                "&:hover": { bgcolor: "background.elevation1" },
                "&.Mui-focused": {
                  bgcolor: "background.elevation1",
                  boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
                },
                "&:before": {
                  display: "none",
                },
                "&:after": {
                  display: "none",
                },
              },
              "& .MuiFilledInput-input": {
                py: 1,
                px: 1.5,
                fontSize: "0.875rem",
                pointerEvents: "auto !important",
              },
              "& .MuiSelect-icon": {
                color: "text.secondary",
                pointerEvents: "auto !important",
              },
            }}
          >
            <Select
              value={agentData.agent}
              onChange={handleSelectChangeLocal("agent")}
              displayEmpty
              disabled={false}
              required
              MenuProps={{
                disablePortal: false,
                style: { zIndex: 10004 },
              }}
              sx={{
                pointerEvents: "auto !important",
                cursor: "pointer",
                "& .MuiSelect-select": {
                  pointerEvents: "auto !important",
                  cursor: "pointer",
                  "&:focus": {
                    bgcolor: "transparent",
                  },
                },
              }}
            >
              <MenuItem value="" disabled>
                <Typography sx={{ color: "text.secondary" }}>Select an agent</Typography>
              </MenuItem>
              {AGENT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              py: 1.5,
              px: 2,
              bgcolor: "background.elevation2",
              borderRadius: 2,
            }}
          >
            {agentData.agent}
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box 
      sx={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 2.5,
        position: "relative",
        zIndex: 1,
        pointerEvents: "auto",
      }}
    >
      {/* Render all added agents */}
      {agents.map((agent, index) => renderAgentForm(agent, index + 1, false, true))}

      {/* Current agent form (editable) - always show label */}
      {renderAgentForm(currentAgent, agents.length + 1, true, true)}

      {/* Add Agent Button - Always visible */}
      <Box sx={{ display: "flex", justifyContent: "flex-start", mt: -1 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAgent}
          disabled={!isFormComplete}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            px: 3,
            py: 1,
            bgcolor: "primary.main",
            color: "common.white",
            fontWeight: 500,
            "&:hover": {
              bgcolor: "primary.dark",
            },
            "&:disabled": {
              bgcolor: "action.disabledBackground",
              color: "action.disabled",
            },
          }}
        >
          Add More Agents
        </Button>
      </Box>
    </Box>
  );
};

export default AddAIAgent;
