import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Switch,
  TextField,
  Collapse,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import "../css/detailsmodal.css";

const DetailsModal = ({ open, onClose, formData = {}, onSave }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [correctiveMeasureMode, setCorrectiveMeasureMode] = useState("prompt"); // "prompt" or "code"
  const [userConfirmation, setUserConfirmation] = useState(formData.userConfirmation || false);
  const [errorDescription, setErrorDescription] = useState(formData.errorDescription || "");
  const [correctiveMeasures, setCorrectiveMeasures] = useState(formData.correctiveMeasures || "");
  const [apiAuthExpanded, setApiAuthExpanded] = useState(true);
  const [apiKey, setApiKey] = useState(formData.apiKey || "");
  const [apiValue, setApiValue] = useState(formData.apiValue || "");

  const protocols = [
    { id: "A", count: 35 },
    { id: "B", count: 35 },
    { id: "C", count: 35 },
  ];

  // Update local state when formData prop changes
  useEffect(() => {
    if (formData) {
      setUserConfirmation(formData.userConfirmation || false);
      setErrorDescription(formData.errorDescription || "");
      setCorrectiveMeasures(formData.correctiveMeasures || "");
      setApiKey(formData.apiKey || "");
      setApiValue(formData.apiValue || "");
    }
  }, [formData]);

  const handleSave = () => {
    const data = {
      userConfirmation,
      errorDescription,
      correctiveMeasures,
      apiKey,
      apiValue,
    };
    if (onSave) {
      onSave(data);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: "80rem",
          width: "100%",
          maxHeight: "90vh",
          borderRadius: "0.75rem",
          zIndex: 20000,
        },
      }}
      sx={{
        zIndex: 20000,
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 19999,
        },
      }}
    >
      <DialogContent className="details-modal-content" sx={{ padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        {/* Header with Tabs */}
        <Box className="details-modal-header">
          <Box className="details-modal-tabs">
            <Button
              className={`details-modal-tab ${activeTab === 0 ? 'active' : ''}`}
              onClick={() => setActiveTab(0)}
            >
              Run Book
            </Button>
            <Button
              className={`details-modal-tab ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)}
              startIcon={<AutoAwesomeIcon />}
            >
              AI Recommendations
            </Button>
          </Box>
          <IconButton
            onClick={onClose}
            className="details-modal-close-btn"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Main Content - Two Column Layout */}
        <Box className="details-modal-main-content">
          {/* Left Panel - Protocol Cards */}
          <Box className="details-modal-left-panel">
            {protocols.map((protocol) => (
              <Card 
                key={protocol.id} 
                className="details-modal-protocol-card"
                sx={{
                  backgroundColor: '#F7FAFC !important',
                  boxShadow: 'none !important',
                  border: 'none !important',
                  borderRadius: '0.75rem !important',
                }}
              >
                <CardContent 
                  className="details-modal-protocol-content"
                  sx={{
                    backgroundColor: 'transparent !important',
                    padding: '1.5rem !important',
                  }}
                >
                  <Box className="details-modal-protocol-header">
                  <Typography 
                    className="details-modal-protocol-title"
                    sx={{
                      fontSize: '1rem !important',
                      fontWeight: '600 !important',
                      color: '#374151 !important',
                    }}
                  >
                    Protocol {protocol.id}
                  </Typography>
                    <IconButton 
                      size="small" 
                      className="details-modal-protocol-icon"
                      sx={{
                        color: '#1e40af !important',
                        backgroundColor: '#dbeafe !important',
                        borderRadius: '50% !important',
                        width: '2rem !important',
                        height: '2rem !important',
                        minWidth: '2rem !important',
                        padding: '0.5rem !important',
                        '&:hover': {
                          backgroundColor: '#bfdbfe !important',
                        },
                        '& svg': {
                          color: '#1e40af !important',
                          fontSize: '1rem !important',
                        },
                      }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                  <Typography 
                    className="details-modal-protocol-count"
                    sx={{
                      fontSize: '2rem !important',
                      fontWeight: '700 !important',
                      color: '#374151 !important',
                      marginBottom: '0.5rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {protocol.count}
                  </Typography>
                  <Typography 
                    className="details-modal-protocol-label"
                    sx={{
                      fontSize: '0.75rem !important',
                      color: '#9ca3af !important',
                      lineHeight: 1.4,
                    }}
                  >
                    Total number of pipeline running
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Right Panel - Details Form */}
          <Box className="details-modal-right-panel">
            <Box className="details-modal-details-header">
              <Typography className="details-modal-title">Details</Typography>
              <Button
                variant="contained"
                onClick={handleSave}
                className="details-modal-save-btn"
              >
                Save
              </Button>
            </Box>

            {/* Scrollable Details Content */}
            <Box className="details-modal-scrollable">
          {/* User Confirmation Required */}
          <Box className="details-modal-section">
            <Box className="details-modal-section-header">
              <Typography className="details-modal-section-label">
                User Confirmation Required
              </Typography>
              <Switch
                checked={userConfirmation}
                onChange={(e) => setUserConfirmation(e.target.checked)}
                className="details-modal-switch"
              />
            </Box>
          </Box>

          {/* Error Description */}
          <Box className="details-modal-section">
            <Typography className="details-modal-section-title">
              Error Description
            </Typography>
            <TextField
              multiline
              rows={4}
              placeholder="Description"
              value={errorDescription}
              onChange={(e) => setErrorDescription(e.target.value)}
              className="details-modal-textarea"
              variant="outlined"
              disabled={false}
            />
          </Box>

          {/* Corrective Measures */}
          <Box className="details-modal-section">
            <Box className="details-modal-section-header">
              <Typography className="details-modal-section-title">
                Corrective Measures
              </Typography>
              <Box className="details-modal-measures-buttons">
                <Button
                  className={`details-modal-measure-btn ${correctiveMeasureMode === "prompt" ? "active" : ""}`}
                  size="small"
                  onClick={() => setCorrectiveMeasureMode("prompt")}
                >
                  Prompt
                </Button>
                <Button
                  className={`details-modal-measure-btn ${correctiveMeasureMode === "code" ? "active" : ""}`}
                  size="small"
                  onClick={() => setCorrectiveMeasureMode("code")}
                >
                  Code
                </Button>
              </Box>
            </Box>
            <TextField
              multiline
              rows={4}
              placeholder="Description"
              value={correctiveMeasures}
              onChange={(e) => setCorrectiveMeasures(e.target.value)}
              className="details-modal-textarea"
              variant="outlined"
              disabled={false}
            />
          </Box>

          {/* API Authentication */}
          <Box className="details-modal-section">
            <Box
              className="details-modal-section-header"
              onClick={() => setApiAuthExpanded(!apiAuthExpanded)}
              sx={{ cursor: "pointer" }}
            >
              <Typography className="details-modal-section-title">
                API Authentication
              </Typography>
              <IconButton size="small" className="details-modal-expand-btn">
                {apiAuthExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={apiAuthExpanded}>
              <Box className="details-modal-api-fields">
                <TextField
                  label="Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="details-modal-api-input"
                  variant="outlined"
                  size="small"
                  disabled={false}
                />
                <TextField
                  label="Value"
                  value={apiValue}
                  onChange={(e) => setApiValue(e.target.value)}
                  className="details-modal-api-input"
                  variant="outlined"
                  size="small"
                  disabled={false}
                />
              </Box>
            </Collapse>
          </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;

