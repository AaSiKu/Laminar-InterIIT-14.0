import React, { useState } from "react";
import { Box, Typography, Paper, Menu, MenuItem, IconButton } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const OverviewSection = ({ data, kpiData }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCopyJson = () => {
    // Combine overview data and KPI cards data for complete snapshot
    const snapshotData = {
      timestamp: new Date().toISOString(),
      overview: {
        total: data?.total,
        running: data?.running,
        broken: data?.broken,
        stopped: data?.stopped,
      },
      kpiCards: kpiData || [],
    };
    const jsonData = JSON.stringify(snapshotData, null, 2);
    navigator.clipboard.writeText(jsonData).then(() => {
      console.log("Dashboard data copied to clipboard");
    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
    handleMenuClose();
  };
  // Chart data - all segments with uniform thickness
  console.log("car", data);
  const chartData = [
    {
      name: "Running",
      value: data?.running || 0,
      color: "#86C8BC", // Teal
    },
    {
      name: "Broken",
      value: data?.broken || 0,
      color: "#F0B4C4", // Pink
    },
    {
      name: "Stopped",
      value: data?.stopped || 0,
      color: "#A2B8F4", // Blue
    },
  ].filter(item => item.value > 0);

  const total = data?.total;

  return (
    <Paper
      sx={{
        p: '2rem',
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.elevation1',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: "1rem",
        }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight="700"
            sx={{ mb: "0.25rem", fontSize: "1.5rem" }}
          >
            Overview
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.875rem" }}
          >
            Current state of workflows
          </Typography>
        </Box>
        <IconButton
          onClick={handleMenuClick}
          sx={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: 0,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MoreHorizIcon
            sx={{ fontSize: "1.25rem", color: "text.secondary" }}
          />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleCopyJson} sx={{ gap: 1 }}>
            <ContentCopyIcon sx={{ fontSize: '1rem' }} />
            Copy JSON
          </MenuItem>
        </Menu>
      </Box>

      {/* Semicircle Donut Chart - Top 40% */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          flex: "0 0 40%",
          position: "relative",
          pt: "1rem",
        }}
      >
        <Box sx={{ position: "relative", width: "20rem", height: "10rem" }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <Box
            sx={{
              position: "absolute",
              bottom: "-1.875rem",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
            }}
          >
            <Typography variant="h3" fontWeight="700" sx={{ fontSize: "2rem" }}>
              {total}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.875rem" }}
            >
              Total
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Legend - Bottom section with centered boxes */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1.5rem",
          flex: "1",
          mt: "3rem",
          pt: "1rem",
          flexWrap: "nowrap",
          "@media (min-width: 112.5rem) and (max-width: 134.3125rem)": {
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: "1rem",
            maxWidth: "80%",
          },
        }}
      >
        {chartData.map((item, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              "@media (min-width: 112.5rem) and (max-width: 134.3125rem)": {
                justifyContent: "center",
              },
            }}
          >
            <Box
              sx={{
                width: "0.25rem",
                height: "2.25rem",
                bgcolor: item.color,
                borderRadius: "0.125rem",
              }}
            />
            <Box sx={{ textAlign: "left" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontSize: "0.75rem", lineHeight: 1.2 }}
              >
                {item.name}
              </Typography>
              <Typography
                variant="body2"
                fontWeight="600"
                sx={{ fontSize: "0.875rem" }}
              >
                {item.value.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default OverviewSection;
