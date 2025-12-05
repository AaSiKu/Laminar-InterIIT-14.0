import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Switch,
  Checkbox,
  FormControlLabel,
  TextField,
  Collapse,
  Tabs,
  Tab,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  ButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const RunBook = ({ open, onClose, formData = {}, onSave }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [name, setName] = useState(formData.name || "");
  const [userConfirmation, setUserConfirmation] = useState(
    formData.userConfirmation || false
  );
  const [errorDescription, setErrorDescription] = useState(
    formData.errorDescription || ""
  );
  const [actionDiscoveryMode, setActionDiscoveryMode] = useState(formData.actionDiscoveryMode || "");

  // Manual action form state
  const [actionId, setActionId] = useState(formData.actionId || "");
  const [serviceName, setServiceName] = useState(formData.serviceName || "");
  const [executionMethod, setExecutionMethod] = useState(formData.executionMethod || "");
  const [actionDescription, setActionDescription] = useState(formData.actionDescription || "");
  const [riskLevel, setRiskLevel] = useState(formData.riskLevel || "");
  const [requiresApproval, setRequiresApproval] = useState(formData.requiresApproval || false);
  const [secrets, setSecrets] = useState(
    formData.secrets && typeof formData.secrets === 'object'
      ? Object.entries(formData.secrets).map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }]
  );
  const [command, setCommand] = useState(formData.command || "");
  const [timeoutSeconds, setTimeoutSeconds] = useState(formData.timeoutSeconds || "");
  const [parameters, setParameters] = useState(
    formData.parameters && typeof formData.parameters === 'object' 
      ? Object.entries(formData.parameters).map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }]
  );
  const [tags, setTags] = useState(formData.metadata?.tags || [""]);

  // Swagger/OpenAPI form state
  const [swaggerUrl, setSwaggerUrl] = useState(formData.swaggerUrl || "");
  const [swaggerFile, setSwaggerFile] = useState(null);
  const [swaggerFileName, setSwaggerFileName] = useState("");
  const [swaggerServiceName, setSwaggerServiceName] = useState(formData.swaggerServiceName || "");

  // Script Discovery form state
  const [scriptPath, setScriptPath] = useState(formData.scriptPath || "");
  const [scriptServiceName, setScriptServiceName] = useState(formData.scriptServiceName || "");
  const [accessViaSSH, setAccessViaSSH] = useState(formData.accessViaSSH || false);
  const [sshHost, setSshHost] = useState(formData.sshHost || "");
  const [sshUsername, setSshUsername] = useState(formData.sshUsername || "");
  const [sshPassword, setSshPassword] = useState(formData.sshPassword || "");
  const [sshKeyPath, setSshKeyPath] = useState(formData.sshKeyPath || "");

  // Documentation Discovery form state
  const [documentation, setDocumentation] = useState(formData.documentation || "");
  const [documentationFile, setDocumentationFile] = useState(null);
  const [documentationFileName, setDocumentationFileName] = useState("");

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

  // Track previous formData to prevent unnecessary updates
  const prevFormDataRef = useRef(null);

  // Update local state when formData prop changes (only if values actually changed)
  useEffect(() => {
    // Skip if formData hasn't changed or is the same reference
    if (!formData || prevFormDataRef.current === formData) {
      return;
    }

    // Check if any values actually changed
    const prevData = prevFormDataRef.current;
    const hasChanged =
      !prevData ||
      prevData.name !== formData.name ||
      prevData.userConfirmation !== formData.userConfirmation ||
      prevData.errorDescription !== formData.errorDescription ||
      prevData.correctiveMeasures !== formData.correctiveMeasures ||
      prevData.correctiveMeasureMode !== formData.correctiveMeasureMode ||
      prevData.apiKey !== formData.apiKey ||
      prevData.apiValue !== formData.apiValue ||
      prevData.runBookErrorDescription !== formData.runBookErrorDescription ||
      JSON.stringify(prevData.actions) !== JSON.stringify(formData.actions);

    if (hasChanged) {
      setName(formData.name || "");
      setUserConfirmation(formData.userConfirmation || false);
      setErrorDescription(formData.errorDescription || "");
      setRunBookErrorDescription(formData.runBookErrorDescription || "");
      setActions(formData.actions || [""]);
      setActionDiscoveryMode(formData.actionDiscoveryMode || "");
      setActionId(formData.actionId || "");
      setServiceName(formData.serviceName || "");
      setExecutionMethod(formData.executionMethod || "");
      setActionDescription(formData.actionDescription || "");
      setRiskLevel(formData.riskLevel || "");
      setRequiresApproval(formData.requiresApproval || false);
      setSecrets(
        formData.secrets && typeof formData.secrets === 'object'
          ? Object.entries(formData.secrets).map(([key, value]) => ({ key, value }))
          : [{ key: "", value: "" }]
      );
      setCommand(formData.command || "");
      setTimeoutSeconds(formData.timeoutSeconds || "");
      setParameters(
        formData.parameters && typeof formData.parameters === 'object'
          ? Object.entries(formData.parameters).map(([key, value]) => ({ key, value }))
          : [{ key: "", value: "" }]
      );
      setTags(formData.metadata?.tags || [""]);
      setSwaggerUrl(formData.swaggerUrl || "");
      setSwaggerFile(null);
      setSwaggerFileName("");
      setSwaggerServiceName(formData.swaggerServiceName || "");
      setScriptPath(formData.scriptPath || "");
      setScriptServiceName(formData.scriptServiceName || "");
      setAccessViaSSH(formData.accessViaSSH || false);
      setSshHost(formData.sshHost || "");
      setSshUsername(formData.sshUsername || "");
      setSshPassword(formData.sshPassword || "");
      setSshKeyPath(formData.sshKeyPath || "");
      setDocumentation(formData.documentation || "");
      setDocumentationFile(null);
      setDocumentationFileName("");
    }
  }, [open]);

  const handleSave = async () => {
    // Read file contents if files are selected
    let swaggerFileContent = null;
    let documentationFileContent = null;
    
    if (swaggerFile) {
      swaggerFileContent = await swaggerFile.text();
    }
    
    if (documentationFile) {
      documentationFileContent = await documentationFile.text();
    }

    const data = {
      name,
      userConfirmation,
      errorDescription,
      runBookErrorDescription,
      actions,
      actionDiscoveryMode,
      actionId,
      serviceName,
      executionMethod,
      actionDescription,
      riskLevel,
      requiresApproval,
      secrets: secrets.reduce((acc, secret) => {
        if (secret.key.trim() !== "") {
          acc[secret.key] = secret.value;
        }
        return acc;
      }, {}),
      executionDetails: {
        command: command,
        timeout_seconds: timeoutSeconds,
      },
      parameters: parameters.reduce((acc, param) => {
        if (param.key.trim() !== "") {
          acc[param.key] = param.value;
        }
        return acc;
      }, {}),
      metadata: {
        tags: tags.filter(tag => tag.trim() !== ""),
      },
      swaggerUrl: swaggerFile ? null : swaggerUrl,
      swaggerFile: swaggerFileContent,
      swaggerFileName: swaggerFileName || null,
      swaggerServiceName,
      scriptPath,
      scriptServiceName,
      accessViaSSH,
      sshHost,
      sshUsername,
      sshPassword,
      sshKeyPath,
      documentation: documentationFile ? null : documentation,
      documentationFile: documentationFileContent,
      documentationFileName: documentationFileName || null,
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
                  bgcolor: "background.elevation1",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "background.elevation1",
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
                        bgcolor: "background.elevation1",
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
                          height: "3rem",
                          bgcolor: "background.elevation1",
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
                        height: "3rem",
                        bgcolor: "background.elevation1",
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
                        bgcolor: "background.elevation1",
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

                {/* Action Discovery Mode */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Add action method
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      value={actionDiscoveryMode}
                      onChange={(e) => setActionDiscoveryMode(e.target.value)}
                      displayEmpty
                      variant="outlined"
                    sx={{
                        height: "3rem",
                        bgcolor: "background.elevation1",
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
                        Select an option
                      </MenuItem>
                      <MenuItem value="manual">Add action manually</MenuItem>
                      <MenuItem value="swagger">Discover from Swagger/OpenAI</MenuItem>
                      <MenuItem value="script">Discover from script</MenuItem>
                      <MenuItem value="documentation">Discover from documentation</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Manual Action Fields */}
                {actionDiscoveryMode === "manual" && (
                  <Box>
                    {/* Top Section */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Action ID
                    </Typography>
                        <TextField
                          value={actionId}
                          onChange={(e) => setActionId(e.target.value)}
                          variant="outlined"
                          fullWidth
                          placeholder="restart-nginx-service"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              height: "3rem",
                              bgcolor: "background.elevation1",
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

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Execution Method
                        </Typography>
                        <FormControl fullWidth variant="outlined">
                          <Select
                            value={executionMethod}
                            onChange={(e) => setExecutionMethod(e.target.value)}
                            displayEmpty
                            variant="outlined"
                            sx={{
                              height: "3rem",
                              bgcolor: "background.elevation1",
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
                            <MenuItem value="">Select method</MenuItem>
                            <MenuItem value="rpc">rpc</MenuItem>
                            <MenuItem value="http">http</MenuItem>
                            <MenuItem value="ssh">ssh</MenuItem>
                          </Select>
                        </FormControl>
                  </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Description
                        </Typography>
                  <TextField
                    multiline
                          rows={3}
                          value={actionDescription}
                          onChange={(e) => setActionDescription(e.target.value)}
                    variant="outlined"
                    fullWidth
                          placeholder="Restart nginx web server"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                              bgcolor: "background.elevation1",
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
                </Box>

                    {/* Bottom Section - Risk Level, Requires Approval, Secrets */}
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Risk Level
                        </Typography>
                        <FormControl fullWidth variant="outlined">
                          <Select
                            value={riskLevel}
                            onChange={(e) => setRiskLevel(e.target.value)}
                            displayEmpty
                            variant="outlined"
                    sx={{
                              height: "3rem",
                              bgcolor: "background.elevation1",
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
                            <MenuItem value="">Select risk level</MenuItem>
                            <MenuItem value="low">low</MenuItem>
                            <MenuItem value="medium">medium</MenuItem>
                            <MenuItem value="high">high</MenuItem>
                          </Select>
                        </FormControl>
                  </Box>

                      <Box sx={{ mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={requiresApproval}
                              onChange={(e) => setRequiresApproval(e.target.checked)}
                              sx={{
                                color: "primary.main",
                                "&.Mui-checked": {
                                  color: "primary.main",
                                },
                              }}
                            />
                          }
                          label={
                    <Typography variant="body2" fontWeight={600}>
                              Requires Approval
                    </Typography>
                          }
                        />
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Secrets
                        </Typography>
                        {secrets.map((secret, index) => (
                          <Box key={index} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                            <TextField
                              value={secret.key}
                              onChange={(e) => {
                                const newSecrets = [...secrets];
                                newSecrets[index] = { ...newSecrets[index], key: e.target.value };
                                setSecrets(newSecrets);
                              }}
                              variant="outlined"
                              placeholder="Key"
                              sx={{
                                flex: 1,
                                "& .MuiOutlinedInput-root": {
                                  height: "3rem",
                                  bgcolor: "background.elevation1",
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
                            <TextField
                              type="password"
                              value={secret.value}
                              onChange={(e) => {
                                const newSecrets = [...secrets];
                                newSecrets[index] = { ...newSecrets[index], value: e.target.value };
                                setSecrets(newSecrets);
                              }}
                              variant="outlined"
                              placeholder="Value"
                              sx={{
                                flex: 1,
                                "& .MuiOutlinedInput-root": {
                                  height: "3rem",
                                  bgcolor: "background.elevation1",
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
                            {index === secrets.length - 1 && (
                              <IconButton
                                onClick={() => {
                                  setSecrets([...secrets, { key: "", value: "" }]);
                                }}
                                sx={{
                                  bgcolor: "primary.lighter",
                                  color: "primary.main",
                                  "&:hover": {
                                    bgcolor: "primary.light",
                                  },
                                }}
                      >
                                <AddIcon />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* JSON Configuration Blocks - Last Three Fields */}
                    <Box sx={{ mt: 3 }}>
                      {/* Command and Timeout Seconds */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Command
                        </Typography>
                        <TextField
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          variant="outlined"
                          fullWidth
                          placeholder="systemctl restart nginx"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              height: "3rem",
                              bgcolor: "background.elevation1",
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

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Timeout Seconds
                        </Typography>
                        <TextField
                          type="number"
                          value={timeoutSeconds}
                          onChange={(e) => setTimeoutSeconds(e.target.value)}
                          variant="outlined"
                          fullWidth
                          placeholder="30"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              height: "3rem",
                              bgcolor: "background.elevation1",
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

                      {/* Parameters */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Parameters
                        </Typography>
                        {parameters.map((param, index) => (
                          <Box key={index} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                            <TextField
                              value={param.key}
                              onChange={(e) => {
                                const newParameters = [...parameters];
                                newParameters[index] = { ...newParameters[index], key: e.target.value };
                                setParameters(newParameters);
                              }}
                              variant="outlined"
                              placeholder="Key"
                              sx={{
                                flex: 1,
                                "& .MuiOutlinedInput-root": {
                                  height: "3rem",
                                  bgcolor: "background.elevation1",
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
                            <TextField
                              value={param.value}
                              onChange={(e) => {
                                const newParameters = [...parameters];
                                newParameters[index] = { ...newParameters[index], value: e.target.value };
                                setParameters(newParameters);
                              }}
                              variant="outlined"
                              placeholder="Value"
                              sx={{
                                flex: 1,
                                "& .MuiOutlinedInput-root": {
                                  height: "3rem",
                                  bgcolor: "background.elevation1",
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
                            {index === parameters.length - 1 && (
                              <IconButton
                                onClick={() => {
                                  setParameters([...parameters, { key: "", value: "" }]);
                                }}
                                sx={{
                                  bgcolor: "primary.lighter",
                                  color: "primary.main",
                                  "&:hover": {
                                    bgcolor: "primary.light",
                                  },
                                }}
                              >
                                <AddIcon />
                              </IconButton>
                            )}
                  </Box>
                        ))}
                      </Box>

                      {/* Tags */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Tags
                        </Typography>
                        {tags.map((tag, index) => (
                          <Box key={index} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <TextField
                              value={tag}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index] = e.target.value;
                                setTags(newTags);
                              }}
                    variant="outlined"
                    fullWidth
                              placeholder="Enter tag"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                                  height: "3rem",
                                  bgcolor: "background.elevation1",
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
                            {index === tags.length - 1 && (
                              <IconButton
                                onClick={() => {
                                  setTags([...tags, ""]);
                                }}
                                sx={{
                                  bgcolor: "primary.lighter",
                                  color: "primary.main",
                                  "&:hover": {
                                    bgcolor: "primary.light",
                                  },
                                }}
                              >
                                <AddIcon />
                    </IconButton>
                            )}
                </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Swagger/OpenAPI Fields */}
                {actionDiscoveryMode === "swagger" && (
                <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Swagger/OpenAPI URL
                    </Typography>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <TextField
                          value={swaggerUrl}
                          onChange={(e) => {
                            setSwaggerUrl(e.target.value);
                            setSwaggerFile(null);
                            setSwaggerFileName("");
                          }}
                          variant="outlined"
                          fullWidth
                          placeholder="http://localhost:8000/openapi.json"
                          disabled={!!swaggerFile}
                    sx={{
                            "& .MuiOutlinedInput-root": {
                              height: "3rem",
                              bgcolor: "background.elevation1",
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
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                          or
                        </Typography>
                        <input
                          accept=".json,.yaml,.yml"
                          style={{ display: "none" }}
                          id="swagger-file-upload"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setSwaggerFile(file);
                              setSwaggerFileName(file.name);
                              setSwaggerUrl("");
                            }
                          }}
                        />
                        <label htmlFor="swagger-file-upload">
                          <Button
                            component="span"
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            sx={{
                              height: "3rem",
                              whiteSpace: "nowrap",
                              color: "#000",
                              borderColor: "#000",
                              "&:hover": {
                                borderColor: "#000",
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                              },
                            }}
                  >
                            {swaggerFileName || "Upload File"}
                          </Button>
                        </label>
                      </Box>
                      {swaggerFileName && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          {swaggerFileName}
                    </Typography>
                      )}
                  </Box>
                  </Box>
                )}

                {/* Script Discovery Fields */}
                {actionDiscoveryMode === "script" && (
                <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Script Path
                        </Typography>
                        <TextField
                        value={scriptPath}
                        onChange={(e) => setScriptPath(e.target.value)}
                          variant="outlined"
                          fullWidth
                        placeholder="/path/to/script.sh or /var/scripts/"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                            height: "3rem",
                            bgcolor: "background.elevation1",
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

                    <Box sx={{ mb: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={accessViaSSH}
                            onChange={(e) => setAccessViaSSH(e.target.checked)}
                            sx={{
                              color: "primary.main",
                              "&.Mui-checked": {
                                color: "primary.main",
                              },
                            }}
                          />
                        }
                        label={
                    <Typography variant="body2" fontWeight={600}>
                            Access via SSH
                        </Typography>
                        }
                      />
                      </Box>

                    {/* SSH Configuration Fields */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        SSH Host
                      </Typography>
                        <TextField
                        value={sshHost}
                        onChange={(e) => setSshHost(e.target.value)}
                          variant="outlined"
                          fullWidth
                        placeholder="server.example.com"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                            height: "3rem",
                            bgcolor: "background.elevation1",
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

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        SSH Username
                        </Typography>
                      <TextField
                        value={sshUsername}
                        onChange={(e) => setSshUsername(e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="admin"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            height: "3rem",
                            bgcolor: "background.elevation1",
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

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        SSH Password (optional)
                      </Typography>
                        <TextField
                        type="password"
                        value={sshPassword}
                        onChange={(e) => setSshPassword(e.target.value)}
                          variant="outlined"
                          fullWidth
                          sx={{
                            "& .MuiOutlinedInput-root": {
                            height: "3rem",
                            bgcolor: "background.elevation1",
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

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        SSH Key Path (optional)
                        </Typography>
                      <TextField
                        value={sshKeyPath}
                        onChange={(e) => setSshKeyPath(e.target.value)}
                        variant="outlined"
                        fullWidth
                        placeholder="/home/user/.ssh/id_rsa"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            height: "3rem",
                            bgcolor: "background.elevation1",
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
                    </Box>
                )}

                {/* Documentation Discovery Field */}
                {actionDiscoveryMode === "documentation" && (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Documentation
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <input
                          accept=".txt,.md,.pdf"
                          style={{ display: "none" }}
                          id="documentation-file-upload"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setDocumentationFile(file);
                              setDocumentationFileName(file.name);
                              setDocumentation("");
                            }
                          }}
                        />
                        <label htmlFor="documentation-file-upload">
                          <Button
                            component="span"
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            sx={{
                              mb: 1,
                              color: "#000",
                              borderColor: "#000",
                              "&:hover": {
                                borderColor: "#000",
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                              },
                            }}
                          >
                            {documentationFileName || "Upload File"}
                          </Button>
                        </label>
                        {documentationFileName && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {documentationFileName}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: "center" }}>
                        or
                      </Typography>
                      <TextField
                        multiline
                        rows={12}
                        value={documentation}
                        onChange={(e) => {
                          setDocumentation(e.target.value);
                          setDocumentationFile(null);
                          setDocumentationFileName("");
                        }}
                        variant="outlined"
                        fullWidth
                        placeholder="Enter documentation..."
                        disabled={!!documentationFile}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            bgcolor: "background.elevation1",
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
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default RunBook;
