import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PipelineIcon from "@mui/icons-material/AccountTree";
import TimerIcon from "@mui/icons-material/Timer";
import NotificationsIcon from "@mui/icons-material/Notifications";

// --- Data Fetching Functions (Unchanged) ---
const fetchKpiData = async () => {
  return [
    {
      title: "Pipelines Running",
      value: "3",
      description: "Currently active pipelines",
      icon: PipelineIcon,
      color: "#3b82f6",
    },
    {
      title: "Total Pipelines",
      value: "6",
      description: "Total deployed pipeline instances",
      icon: TrendingUpIcon,
      color: "#3b82f6",
    },
    {
      title: "Average Runtime",
      value: "3.2 hrs",
      description: "Mean duration per pipeline",
      icon: TimerIcon,
      color: "#3b82f6",
    },
    {
      title: "Alerts Today",
      value: "5",
      description: "Total alerts generated today",
      icon: NotificationsIcon,
      color: "#3b82f6",
    },
  ];
};

const fetchPipelines = async () => {
  return [
    {
      id: 1,
      name: "Pipeline A",
      status: "Running",
      breachReason: "Disk I/O saturation",
      lastBreachTime: "10:30 AM",
      owner: "Team Alpha",
    },
    {
      id: 2,
      name: "Pipeline B",
      status: "Completed",
      breachReason: "-",
      lastBreachTime: "9:00 AM",
      owner: "Team Beta",
    },
    {
      id: 3,
      name: "Pipeline C",
      status: "Failed",
      breachReason: "Network timeout",
      lastBreachTime: "11:15 AM",
      owner: "Team Gamma",
    },
    {
      id: 4,
      name: "Pipeline D",
      status: "Running",
      breachReason: "Input data skew",
      lastBreachTime: "12:05 PM",
      owner: "Team Delta",
    },
    {
      id: 5,
      name: "Pipeline E",
      status: "Running",
      breachReason: "Memory pressure",
      lastBreachTime: "1:20 PM",
      owner: "Team Alpha",
    },
    {
      id: 6,
      name: "Pipeline F",
      status: "Completed",
      breachReason: "-",
      lastBreachTime: "8:45 AM",
      owner: "Team Beta",
    },
  ];
};

// --- KPI Card Component with Glassy Effect ---
function KpiCard({ title, value, description, icon: Icon, color }) {
  return (
    <Card
      sx={{
        height: "180px",
        width: "100%",
        borderRadius: "20px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(59, 130, 246, 0.08)",
        boxShadow: "0 4px 20px 0 rgba(59, 130, 246, 0.08)",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        position: "relative",
        overflow: "hidden",
        flex: 1,
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          opacity: 0.7,
        },
        "&:hover": {
          transform: "translateY(-12px)",
          boxShadow: "0 12px 40px 0 rgba(59, 130, 246, 0.15)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
          background: "rgba(255, 255, 255, 1)",
        },
      }}
    >
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={500}
            sx={{ letterSpacing: "0.3px" }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              background: `linear-gradient(135deg, ${color}15, ${color}08)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon sx={{ fontSize: 24, color: color }} />
          </Box>
        </Box>
        <Box>
          <Typography
            variant="h2"
            fontWeight="700"
            sx={{
              fontSize: "2.5rem",
              color: "text.primary",
              mb: 0.5,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.75rem" }}
          >
            {description}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// --- Pipeline Table Component with Enhanced Styling ---
function PipelineTable({ pipelines }) {
  return (
    <TableContainer
      sx={{
        borderRadius: "12px",
        overflowX: "hidden",
        "& .MuiTable-root": {
          borderCollapse: "separate",
          borderSpacing: 0,
        },
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: 600,
                bgcolor: "rgba(249, 250, 251, 0.8)",
                borderBottom: "2px solid",
                borderColor: "divider",
                py: 2,
                fontSize: "0.875rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Pipeline Name
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 600,
                bgcolor: "rgba(249, 250, 251, 0.8)",
                borderBottom: "2px solid",
                borderColor: "divider",
                py: 2,
                fontSize: "0.875rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Status
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 600,
                bgcolor: "rgba(249, 250, 251, 0.8)",
                borderBottom: "2px solid",
                borderColor: "divider",
                py: 2,
                fontSize: "0.875rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Breach Reason
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 600,
                bgcolor: "rgba(249, 250, 251, 0.8)",
                borderBottom: "2px solid",
                borderColor: "divider",
                py: 2,
                fontSize: "0.875rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Last Breach Time
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 600,
                bgcolor: "rgba(249, 250, 251, 0.8)",
                borderBottom: "2px solid",
                borderColor: "divider",
                py: 2,
                fontSize: "0.875rem",
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Owner
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pipelines.map((pipeline, index) => (
            <TableRow
              key={pipeline.id}
              sx={{
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(59, 130, 246, 0.03)",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.08)",
                },
                "& > td": {
                  borderBottom:
                    index === pipelines.length - 1 ? "none" : "1px solid",
                  borderColor: "rgba(0, 0, 0, 0.06)",
                  py: 2.5,
                },
              }}
            >
              <TableCell>
                <Typography fontWeight={600} sx={{ fontSize: "0.95rem" }}>
                  {pipeline.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={pipeline.status}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    borderRadius: "8px",
                    ...(pipeline.status === "Running" && {
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                      color: "#059669",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                    }),
                    ...(pipeline.status === "Failed" && {
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                      color: "#dc2626",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                    }),
                    ...(pipeline.status === "Completed" && {
                      bgcolor: "rgba(59, 130, 246, 0.1)",
                      color: "#3b82f6",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                    }),
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color:
                      pipeline.breachReason === "-"
                        ? "text.secondary"
                        : "text.primary",
                  }}
                >
                  {pipeline.breachReason}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                >
                  {pipeline.lastBreachTime}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  {pipeline.owner}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// --- Main Leadership Dashboard Component ---
export function AdminPage() {
  const [kpiData, setKpiData] = useState([]);
  const [pipelines, setPipelines] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const kpi = await fetchKpiData();
      const pipelineData = await fetchPipelines();
      setKpiData(kpi);
      setPipelines(pipelineData);
    };
    loadData();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#ffffff",
        bgcolor: "background.default",
        overflowX: "hidden",
      }}
    >
      <Box
        sx={{
          maxWidth: "1400px",
          margin: "0 auto",
          py: 5,
          px: 4,
          overflowX: "hidden",
        }}
      >
        {/* Header Title */}
        <Typography
          variant="h3"
          fontWeight="700"
          sx={{
            mb: 5,
            color: "text.primary",
            letterSpacing: "-0.5px",
          }}
        >
          Admin Dashboard
        </Typography>

        {/* KPI Summary Cards Section */}
        <Box sx={{ width: "100%", mb: 5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 3,
              width: "100%",
            }}
          >
            {kpiData.map((kpi, index) => (
              <Box key={index}>
                <KpiCard
                  title={kpi.title}
                  value={kpi.value}
                  description={kpi.description}
                  icon={kpi.icon}
                  color={kpi.color}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Active Pipelines Table Section */}
        <Box sx={{ width: "100%" }}>
          <Paper
            sx={{
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(59, 130, 246, 0.08)",
              boxShadow: "0 4px 20px 0 rgba(59, 130, 246, 0.08)",
              overflow: "hidden",
              transition: "all 0.3s ease",
              width: "100%",
              "&:hover": {
                boxShadow: "0 8px 32px 0 rgba(59, 130, 246, 0.12)",
              },
            }}
          >
            <Box sx={{ p: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight="700"
                  sx={{ color: "text.primary" }}
                >
                  Active Pipelines Overview
                </Typography>
                <Chip
                  label={`${pipelines.length} Total`}
                  sx={{
                    bgcolor: "rgba(59, 130, 246, 0.1)",
                    color: "#3b82f6",
                    fontWeight: 600,
                    borderRadius: "10px",
                  }}
                />
              </Box>
              <PipelineTable pipelines={pipelines} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
