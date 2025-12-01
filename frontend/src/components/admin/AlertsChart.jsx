import { useState } from "react";
import { Typography, IconButton, Box, Paper, ButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, useTheme } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ViewListIcon from "@mui/icons-material/ViewList";

export function AlertsChart({ data }) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "table"
  const maxValue = 35;
  const minValue = 0;
  const valueRange = maxValue - minValue; // 35
  const barHeight = 16; // rem
  
  // Calculate bar height based on value position in range (10-35)
  const getBarHeight = (value) => {
    const normalizedValue = Math.max(0, value - minValue);
    return (normalizedValue / valueRange) * barHeight;
  };

  // Transform chart data for table view
  const tableData = data.map((item) => {
    // Determine indicator color based on highest value
    const maxType = item.warning >= item.critical && item.warning >= item.low 
      ? "warning" 
      : item.critical >= item.low 
        ? "critical" 
        : "low";
    
    // Calculate test percentage (total / max possible)
    const total = item.warning + item.critical + item.low;
    const testPercent = ((total / 100) * 100).toFixed(1);
    
    // Calculate month change (random for demo, based on low value)
    const monthChange = (item.low / 10).toFixed(2);
    const monthColor = item.low > item.warning ? "success" : item.warning > 20 ? "error" : "warning";
    
    return {
      pipeline: item.workflow.replace("Workflow", "Pipeline"),
      indicator: maxType,
      test: `${testPercent}%`,
      month: `${monthChange}%`,
      monthColor,
    };
  });

  const getIndicatorColor = (type) => {
    switch (type) {
      case 'warning':
        return theme.palette.error.main;
      case 'critical':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.elevation1',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        height: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          Alerts
        </Typography>
        <ButtonGroup
          variant="contained"
          sx={{
            bgcolor: 'background.paper',
            boxShadow: theme.shadows[2],
            borderRadius: 2,
            p: 0.5,
          }}
        >
          <IconButton
            size="medium"
            onClick={() => setViewMode("chart")}
            sx={{
              bgcolor: viewMode === "chart" ? 'action.selected' : 'transparent',
              color: viewMode === "chart" ? 'text.primary' : 'text.secondary',
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: viewMode === "chart" ? 'action.selected' : 'action.hover',
              },
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: "1.5rem" }} />
          </IconButton>
          <IconButton
            size="medium"
            onClick={() => setViewMode("table")}
            sx={{
              bgcolor: viewMode === "table" ? 'action.selected' : 'transparent',
              color: viewMode === "table" ? 'text.primary' : 'text.secondary',
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: viewMode === "table" ? 'action.selected' : 'action.hover',
              },
            }}
          >
            <ViewListIcon sx={{ fontSize: "1.5rem" }} />
          </IconButton>
        </ButtonGroup>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          Status of alerts
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.375,
            fontSize: '0.75rem',
            color: 'text.primary',
          }}
        >
          <Box
            sx={{
              width: '0.625rem',
              height: '0.625rem',
              borderRadius: '2px',
              bgcolor: 'error.main',
            }}
          />
          Warning
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.375,
            fontSize: '0.75rem',
            color: 'text.primary',
          }}
        >
          <Box
            sx={{
              width: '0.625rem',
              height: '0.625rem',
              borderRadius: '2px',
              bgcolor: 'warning.main',
            }}
          />
          Critical
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.375,
            fontSize: '0.75rem',
            color: 'text.primary',
          }}
        >
          <Box
            sx={{
              width: '0.625rem',
              height: '0.625rem',
              borderRadius: '2px',
              bgcolor: 'success.main',
            }}
          />
          Low
        </Box>
      </Box>
      
      {viewMode === "chart" ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Chart Area */}
          <Box
            sx={{
              display: 'flex',
              position: 'relative',
              height: `${barHeight}rem`,
              pr: 4,
            }}
          >
            {/* Grid Lines Background - evenly distributed across full height */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: '2rem',
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}
            >
              {[35, 30, 25, 20, 15, 10, 5, 0].map((val, index) => (
                <Box
                  key={val}
                  sx={{
                    width: '100%',
                    borderBottom: '1px dashed',
                    borderColor: 'divider',
                  }}
                />
              ))}
            </Box>
            
            {/* Bars Container */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                pr: 5,
                gap: 0.5,
                position: 'relative',
                zIndex: 1,
                height: '100%',
              }}
            >
              {data.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: 0.125,
                    flex: 1,
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <Box
                    sx={{
                      width: '0.625rem',
                      minHeight: '0.25rem',
                      height: `${getBarHeight(item.warning)}rem`,
                      borderRadius: '2px 2px 0 0',
                      bgcolor: 'error.main',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <Box
                    sx={{
                      width: '0.625rem',
                      minHeight: '0.25rem',
                      height: `${getBarHeight(item.critical)}rem`,
                      borderRadius: '2px 2px 0 0',
                      bgcolor: 'warning.main',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <Box
                    sx={{
                      width: '0.625rem',
                      minHeight: '0.25rem',
                      height: `${getBarHeight(item.low)}rem`,
                      borderRadius: '2px 2px 0 0',
                      bgcolor: 'success.main',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </Box>
              ))}
            </Box>
            
            {/* Y-Axis Labels - evenly distributed */}
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {[35, 30, 25, 20, 15, 10, 5, 0].map((val) => (
                <Typography
                  key={val}
                  sx={{
                    fontSize: '0.625rem',
                    color: 'text.secondary',
                    textAlign: 'right',
                    lineHeight: 1,
                  }}
                >
                  {val}
                </Typography>
              ))}
            </Box>
          </Box>
          
          {/* X-Axis Labels (below baseline) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              pr: 5,
              mt: 1,
              gap: 0.5,
            }}
          >
            {data.map((item, index) => (
              <Typography
                key={index}
                sx={{
                  fontSize: '0.625rem',
                  color: 'text.secondary',
                  flex: 1,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {item.workflow}
              </Typography>
            ))}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            mt: 2,
            height: `${barHeight + 2}rem`, // Match chart height
            overflowY: 'auto',
          }}
        >
          <TableContainer
            component={Paper}
            sx={{
              boxShadow: 'none',
              border: 'none',
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      bgcolor: 'background.elevation2',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                    }}
                  >
                    Pipeline
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: 'background.elevation2',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                    }}
                  >
                    TEST
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: 'background.elevation2',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                    }}
                  >
                    This month
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        py: 2,
                        fontSize: '0.9375rem',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: '0.25rem',
                            height: '1.5rem',
                            borderRadius: '2px',
                            bgcolor: getIndicatorColor(row.indicator),
                          }}
                        />
                        <Typography
                          sx={{
                            color: 'text.primary',
                          }}
                        >
                          {row.pipeline}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 2,
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {row.test}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 2,
                        fontSize: '0.9375rem',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Chip
                        label={`${row.month}×`}
                        size="small"
                        color={row.monthColor}
                        variant="soft"
                        sx={{
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          height: 'auto',
                          py: 0.5,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}

