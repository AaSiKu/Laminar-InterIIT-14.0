import { useState } from "react";
import { Box, Typography, Avatar, IconButton } from "@mui/material";
import { Key as KeyIcon, History as HistoryIcon } from "@mui/icons-material";
import { useEffect } from "react";
const LogsSection = ({ logs }) => {
  const [logsView, setLogsView] = useState("logs");
  const colorPalette = ["#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6"];
  // const versionHistory = [
  //   { date: "2025-11-29; 09:15:47", user: "Ninad Ingole", color: "#f97316" },
  //   { date: "2025-11-29; 11:58:03", user: "Manvib25", color: "#10b981" },
  //   { date: "2025-11-29; 16:42:55", user: "Yash Maherwal", color: "#3b82f6" },
  //   { date: "2025-11-29 18:27:19", user: "Nina", color: "#10b981" },
  // ];
  const [versionHistory, setVersionHistory] = useState(null);
  const [lenVersions, setLenVersions] = useState(0);
  let workflow_id = "6930925d05740db6475de887"; // to be replaced with props.workflow.id
  useEffect(() => {
    const fetch_version_history = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/version/retrieve_versions?workflow_id=${workflow_id}`,
          { credentials: "include" }
        );

        const historyData = await res.json();

        setVersionHistory(historyData[0]);
        setLenVersions(historyData[1]);
      } catch (err) {
        console.error("Error fetching versions", err);
      }
    };

    fetch_version_history();
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "text.primary" }}
        >
          {logsView === "logs" ? "Logs" : "Version History"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 0,
            bgcolor: "background.elevation1",
            borderRadius: "8px",
            p: 0.5,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setLogsView("logs")}
            sx={{
              bgcolor: logsView === "logs" ? "background.paper" : "transparent",
              color: logsView === "logs" ? "text.primary" : "text.secondary",
              borderRadius: "6px",
              px: 1,
              py: 0.5,
              boxShadow:
                logsView === "logs" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              "&:hover": {
                bgcolor:
                  logsView === "logs" ? "background.paper" : "action.hover",
              },
            }}
          >
            <KeyIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setLogsView("history")}
            sx={{
              bgcolor:
                logsView === "history" ? "background.paper" : "transparent",
              color: logsView === "history" ? "text.primary" : "text.secondary",
              borderRadius: "6px",
              px: 1,
              py: 0.5,
              boxShadow:
                logsView === "history" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              "&:hover": {
                bgcolor:
                  logsView === "history" ? "background.paper" : "action.hover",
              },
            }}
          >
            <HistoryIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          p: 2,
          pb: 3,
        }}
      >
        {logsView === "logs" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {logs.map((log, index) => (
              <Box key={index} sx={{ display: "flex", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "2px",
                    bgcolor: "background.elevation1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mt: 0.25,
                  }}
                >
                  <KeyIcon
                    sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.8125rem",
                      color: "text.primary",
                      mb: 0.5,
                      lineHeight: 1.5,
                    }}
                  >
                    {log}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: "0.6875rem", color: "text.secondary" }}
                  >
                    9:30 PM
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {versionHistory.map((item, index) => (
              <Box
                key={index}
                sx={{ display: "flex", gap: 1.5, position: "relative" }}
              >
                {index < versionHistory.length - 1 && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: "6px",
                      top: "24px",
                      bottom: "-16px",
                      width: "2px",
                      bgcolor: "divider",
                    }}
                  />
                )}
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    bgcolor: `${colorPalette[index]}`,
                    flexShrink: 0,
                    mt: 0.25,
                    zIndex: 1,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.8125rem",
                      color: "text.primary",
                      mb: 0.5,
                      fontWeight: 600,
                    }}
                  >
                    {item.date.split("T")[0]} at{" "}
                    {item.date.split("T")[1].split(".")[0]}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar
                      src={`https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(
                        item.user
                      )}&size=32`}
                      alt={item.user}
                      sx={{ width: 20, height: 20 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                    >
                      User ID: {item.user}, Version ID: {item.version_id}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
            <Typography
              variant="body2"
              sx={{ fontSize: "0.75rem", color: "text.secondary" }}
            >
              And {lenVersions - 5} more version(s)
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LogsSection;
