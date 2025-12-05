import { Typography, Box, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningIcon from "@mui/icons-material/Warning";

export function PipelineStatsChart({ data }) {
  const theme = useTheme();
  const maxValue = 20;
  const barHeight = 12; // rem
  const totalPipelines = (data.successful || 0) + (data.errors || 0);

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
          height: '100%',
          gap: 4,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              color: 'text.secondary',
              mb: 0.25,
            }}
          >
            Total number of
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
              mb: 0.25,
            }}
          >
            Pipelines
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 400,
              color: 'text.primary',
              mb: 3,
            }}
          >
            {totalPipelines}
          </Typography>
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
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
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'success.lighter',
                  color: 'success.dark',
                }}
              >
                <CheckCircleIcon sx={{ fontSize: "1.25rem" }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: 'text.primary',
                  minWidth: '2.5rem',
                }}
              >
                {data.successful}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                Running
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'error.lighter',
                  color: 'error.dark',
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: "1.25rem" }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: 'text.primary',
                  minWidth: '2.5rem',
                }}
              >
                {data.errors}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                Stopped
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.lighter',
                  color: 'warning.dark',
                }}
              >
                <WarningIcon sx={{ fontSize: "1.25rem" }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  color: 'text.primary',
                  minWidth: '2.5rem',
                }}
              >
                {data.broken || 0}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                Broken
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Chart Area with Grid Lines */}
          <Box
            sx={{
              position: 'relative',
              height: `${barHeight}rem`,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            {/* Grid Lines Background */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}
            >
              {[...Array(5)].map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: '100%',
                    height: '1px',
                    bgcolor: 'divider',
                    opacity: 0.5,
                  }}
                />
              ))}
            </Box>
            
            {/* Bars */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 6,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {data.successful}
                </Typography>
                <Box
                  sx={{
                    width: '3rem',
                    height: `${(data.successful / maxValue) * barHeight}rem`,
                    borderRadius: '4px 4px 0 0',
                    bgcolor: 'success.main',
                    transition: 'height 0.3s ease',
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {data.errors}
                </Typography>
                <Box
                  sx={{
                    width: '3rem',
                    height: `${(data.errors / maxValue) * barHeight}rem`,
                    borderRadius: '4px 4px 0 0',
                    bgcolor: 'error.main',
                    transition: 'height 0.3s ease',
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 0.5,
                  }}
                >
                  {data.broken || 0}
                </Typography>
                <Box
                  sx={{
                    width: '3rem',
                    height: `${((data.broken || 0) / maxValue) * barHeight}rem`,
                    borderRadius: '4px 4px 0 0',
                    bgcolor: 'warning.main',
                    transition: 'height 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          </Box>
          
          {/* X-Axis Labels (below baseline) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              mt: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                width: '3rem',
                textAlign: 'center',
              }}
            >
              Running
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                width: '3rem',
                textAlign: 'center',
              }}
            >
              Stopped
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                width: '3rem',
                textAlign: 'center',
              }}
            >
              Broken
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

