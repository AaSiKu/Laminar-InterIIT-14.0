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
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  Divider,
  ButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";

const RunBook = ({ open, onClose, formData = {}, onSave }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [correctiveMeasureMode, setCorrectiveMeasureMode] = useState("prompt");
  const [name, setName] = useState(formData.name || "");
  const [userConfirmation, setUserConfirmation] = useState(
    formData.userConfirmation || false
  );
  const [errorDescription, setErrorDescription] = useState(
    formData.errorDescription || ""
  );
  const [correctiveMeasures, setCorrectiveMeasures] = useState(
    formData.correctiveMeasures || ""
  );
  const [apiAuthExpanded, setApiAuthExpanded] = useState(true);
  const [apiKey, setApiKey] = useState(formData.apiKey || "");
  const [apiValue, setApiValue] = useState(formData.apiValue || "");

  // Run Book form state
  const [runBookErrorDescription, setRunBookErrorDescription] = useState(
    formData.runBookErrorDescription || ""
  );
  const [actions, setActions] = useState(formData.actions || [""]);

  const protocols = [
    { id: "A", count: 35 },
    { id: "B", count: 35 },
    { id: "C", count: 35 },
    { id: "D", count: 28 },
    { id: "E", count: 42 },
    { id: "F", count: 31 },
    { id: "G", count: 39 },
    { id: "H", count: 26 },
    { id: "I", count: 45 },
    { id: "J", count: 33 },
  ];

  // Update local state when formData prop changes
  useEffect(() => {
    if (formData) {
      setName(formData.name || "");
      setUserConfirmation(formData.userConfirmation || false);
      setErrorDescription(formData.errorDescription || "");
      setCorrectiveMeasures(formData.correctiveMeasures || "");
      setCorrectiveMeasureMode(formData.correctiveMeasureMode || "prompt");
      setApiKey(formData.apiKey || "");
      setApiValue(formData.apiValue || "");
      setRunBookErrorDescription(formData.runBookErrorDescription || "");
      setActions(formData.actions || [""]);
    }
  }, [formData]);

  const handleSave = async () => {
    const data = {
      name,
      userConfirmation,
      errorDescription,
      correctiveMeasures,
      correctiveMeasureMode,
      apiKey,
      apiValue,
      runBookErrorDescription,
      actions,
    };
    console.log("data", data);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER}/book/add_action`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to add action: ${errorText || response.status}`
        );
      }

      const result = await response.json();
      console.log("action added successfully:", result);

      if (onSave) {
        onSave(data);
      }
    } catch (error) {
      console.error("Error saving action:", error);
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
          height: "90vh",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          maxHeight: "700px",
        }}
      >
        {/* Header with Tabs */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
            >
              <Tab label="Run Book" />
              <Tab label="Actions" iconPosition="start" />
            </Tabs>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ ml: "auto" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Main Content - Two Column Layout */}
        <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left Panel - Protocol Cards */}
          <Box
            sx={{
              width: "50%",
              overflowY: "auto",
              p: 3,
              bgcolor: "background.paper",
            }}
          >
            {protocols.map((protocol) => (
              <Card
                key={protocol.id}
                sx={{
                  mb: 2,
                  bgcolor: "grey.50",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "grey.50",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6">Protocol {protocol.id}</Typography>
                    <IconButton
                      size="small"
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "primary.lighter",
                        "&:hover": {
                          bgcolor: "primary.light",
                        },
                        "& svg": {
                          fontSize: "1rem",
                        },
                      }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ mb: 0.5 }}>
                    {protocol.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total number of pipeline running
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Right Panel - Run Book Form */}
          {activeTab === 0 && (
            <Box
              sx={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 3,
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  Run Book
                </Typography>
                <Button variant="contained" onClick={handleSave}>
                  Save
                </Button>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "visible",
                  p: 3,
                  position: "relative",
                }}
              >
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Error Description
                  </Typography>
                  <TextField
                    multiline
                    rows={4}
                    placeholder="Enter error description"
                    value={runBookErrorDescription}
                    onChange={(e) => setRunBookErrorDescription(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#EBF2F5",
                        "& fieldset": {
                          border: "none",
                        },
                        "&:hover fieldset": {
                          border: "none",
                        },
                        "&.Mui-focused fieldset": {
                          border: "none",
                        },
                      },
                    }}
                  />
                </Box>

                {actions.map((action, index) => (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      Action {index + 1}
                    </Typography>
                    <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                      <Select
                        value={action}
                        onChange={(e) => {
                          const newActions = [...actions];
                          newActions[index] = e.target.value;
                          setActions(newActions);
                        }}
                        displayEmpty
                        variant="outlined"
                        sx={{
                          bgcolor: "#EBF2F5",
                          "& .MuiOutlinedInput-notchedOutline": {
                            border: "none",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            border: "none",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            border: "none",
                          },
                        }}
                        MenuProps={{
                          disablePortal: false,
                          container: document.body,
                          PaperProps: {
                            sx: {
                              maxHeight: 300,
                              zIndex: 20002,
                            },
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select an action
                        </MenuItem>
                        <MenuItem value="a">a</MenuItem>
                        <MenuItem value="b">b</MenuItem>
                        <MenuItem value="c">c</MenuItem>
                        <MenuItem value="d">d</MenuItem>
                      </Select>
                    </FormControl>
                    {index === actions.length - 1 && action && (
                      <Box
                        sx={{ display: "flex", justifyContent: "flex-start" }}
                      >
                        <Button
                          onClick={() => setActions([...actions, ""])}
                          startIcon={<AddIcon />}
                          sx={{
                            textTransform: "none",
                            bgcolor: "primary.lighter",
                            color: "primary.main",
                            "&:hover": {
                              bgcolor: "primary.light",
                            },
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Right Panel - Actions Form */}
          {activeTab === 1 && (
            <Box
              sx={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 3,
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  Add Action
                </Typography>
                <Button variant="contained" onClick={handleSave}>
                  Save
                </Button>
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", px: 3 }}>
                {/* Name */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Name
                  </Typography>
                  <TextField
                    placeholder="Enter name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#EBF2F5",
                        "& fieldset": {
                          border: "none",
                        },
                        "&:hover fieldset": {
                          border: "none",
                        },
                        "&.Mui-focused fieldset": {
                          border: "none",
                        },
                      },
                    }}
                  />
                </Box>

                {/* Description */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <TextField
                    multiline
                    rows={4}
                    placeholder="Description"
                    value={errorDescription}
                    onChange={(e) => setErrorDescription(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#EBF2F5",
                        "& fieldset": {
                          border: "none",
                        },
                        "&:hover fieldset": {
                          border: "none",
                        },
                        "&.Mui-focused fieldset": {
                          border: "none",
                        },
                      },
                    }}
                  />
                </Box>

                {/* Corrective Measures */}
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      Corrective Measures
                    </Typography>
                    <ButtonGroup size="small">
                      <Button
                        variant={
                          correctiveMeasureMode === "prompt"
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() => setCorrectiveMeasureMode("prompt")}
                      >
                        Prompt
                      </Button>
                      <Button
                        variant={
                          correctiveMeasureMode === "code"
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() => setCorrectiveMeasureMode("code")}
                      >
                        Code
                      </Button>
                    </ButtonGroup>
                  </Box>
                  <TextField
                    multiline
                    rows={4}
                    placeholder="Description"
                    value={correctiveMeasures}
                    onChange={(e) => setCorrectiveMeasures(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#EBF2F5",
                        "& fieldset": {
                          border: "none",
                        },
                        "&:hover fieldset": {
                          border: "none",
                        },
                        "&.Mui-focused fieldset": {
                          border: "none",
                        },
                      },
                    }}
                  />
                </Box>

                {/* API Authentication */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                      cursor: "pointer",
                    }}
                    onClick={() => setApiAuthExpanded(!apiAuthExpanded)}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      API Authentication
                    </Typography>
                    <IconButton size="small">
                      {apiAuthExpanded ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </Box>
                  <Collapse in={apiAuthExpanded}>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          variant="outlined"
                          fullWidth
                          sx={{
                            mb: 0.5,
                            "& .MuiOutlinedInput-root": {
                              minHeight: "3rem",
                              bgcolor: "#EBF2F5",
                              "& fieldset": {
                                border: "none",
                              },
                              "&:hover fieldset": {
                                border: "none",
                              },
                              "&.Mui-focused fieldset": {
                                border: "none",
                              },
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Key
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          value={apiValue}
                          onChange={(e) => setApiValue(e.target.value)}
                          variant="outlined"
                          fullWidth
                          sx={{
                            mb: 0.5,
                            "& .MuiOutlinedInput-root": {
                              minHeight: "3rem",
                              bgcolor: "#EBF2F5",
                              "& fieldset": {
                                border: "none",
                              },
                              "&:hover fieldset": {
                                border: "none",
                              },
                              "&.Mui-focused fieldset": {
                                border: "none",
                              },
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Value
                        </Typography>
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default RunBook;
