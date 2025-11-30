import { Typography, Box, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningIcon from "@mui/icons-material/Warning";

export function PipelineStatsChart({ data }) {
  const theme = useTheme();
  const maxValue = 20;
  const barHeight = 12; // rem

  return (
    <Box
      sx={{
        bgcolor: 'background.elevation1',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
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
            Pipeline Running
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
            35
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
                Successful
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
                Errors
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
                {data.warning.toString().padStart(2, "0")}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                Warning
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 6,
              height: '100%',
              pb: 3,
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
                  mb: 1,
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
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  mt: 1.5,
                }}
              >
                Successful
              </Typography>
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
                  mb: 1,
                }}
              >
                {data.errors}
              </Typography>
              <Box
                sx={{
                  width: '3rem',
                  height: `${(data.errors / maxValue) * barHeight}rem`,
                  borderRadius: '4px 4px 0 0',
                  bgcolor: 'warning.main',
                  transition: 'height 0.3s ease',
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  mt: 1.5,
                }}
              >
                Errors
              </Typography>
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
                  mb: 1,
                }}
              >
                {data.warning.toString().padStart(2, "0")}
              </Typography>
              <Box
                sx={{
                  width: '3rem',
                  height: `${(data.warning / maxValue) * barHeight}rem`,
                  borderRadius: '4px 4px 0 0',
                  bgcolor: 'error.main',
                  transition: 'height 0.3s ease',
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  mt: 1.5,
                }}
              >
                Warning
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

