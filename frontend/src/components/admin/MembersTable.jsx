import {
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { StatusChip } from "./StatusChip";
import { Avatar } from "@mui/material";

export function MembersTable({ data }) {
  return (
    <Box
      className="admin-members-section"
      sx={{
        bgcolor: 'background.paper',
        p: 2.5,
        width: { xs: '100%', lg: '50%' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            Members
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              mt: 0.125,
            }}
          >
            Current status of all hiring pipelines
          </Typography>
        </Box>
        <TextField
          placeholder="Search Positions"
          size="small"
          sx={{
            width: { xs: '100%', sm: 160 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.elevation1',
              pl: 4,
              '& fieldset': {
                borderColor: 'divider',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <TableContainer
        sx={{
          boxShadow: 'none',
        }}
      >
        <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
          <TableHead>
            <TableRow>
              {['Name', 'Access', 'Env. Access', 'Assigned Pipelines', 'Status', ''].map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    bgcolor: 'transparent',
                    fontWeight: 600,
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025rem',
                    py: 1.5,
                    borderBottom: 'none',
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((member) => (
              <TableRow
                key={member.id}
                sx={{
                  transition: 'background-color 0.2s ease',
                  '&:hover .MuiTableCell-root': {
                    bgcolor: 'action.hover',
                  },
                  '&:active .MuiTableCell-root': {
                    bgcolor: 'action.selected',
                  },
                  '& .MuiTableCell-root': {
                    borderBottom: 'none',
                    bgcolor: 'background.elevation1',
                    '&:first-of-type': {
                      borderTopLeftRadius: '0.75rem',
                      borderBottomLeftRadius: '0.75rem',
                    },
                    '&:last-of-type': {
                      borderTopRightRadius: '0.75rem',
                      borderBottomRightRadius: '0.75rem',
                    },
                  },
                }}
              >
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Avatar
                      src={`https://i.pravatar.cc/40?img=${member.id + 20}`}
                      alt={member.name}
                      sx={{
                        width: 32,
                        height: 32,
                      }}
                    />
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 500,
                          color: 'text.primary',
                          fontSize: '0.875rem',
                        }}
                      >
                        {member.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                        }}
                      >
                        {member.code}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 500,
                      color: 'text.primary',
                      fontSize: '0.875rem',
                    }}
                  >
                    {member.access}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                  }}
                >
                  {member.envAccess}
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    {member.assignedPipelines.toString().padStart(2, "0")}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <StatusChip status={member.status} />
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <MoreHorizIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 2,
          mt: 0.5,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          <span>Showing <strong>5 out of 12</strong> items</span>
          <Button
            size="small"
            sx={{
              color: 'primary.main',
              textTransform: 'none',
              fontSize: '0.75rem',
              p: 0,
              minWidth: 'auto',
            }}
          >
            Show all
          </Button>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
            }}
          >
            <KeyboardDoubleArrowLeftIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <Button
            size="small"
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            1
          </Button>
          <Button
            size="small"
            sx={{
              color: 'text.secondary',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
            }}
          >
            2
          </Button>
          <Button
            size="small"
            sx={{
              color: 'text.secondary',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
            }}
          >
            3
          </Button>
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
            }}
          >
            <ChevronRightIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              color: 'text.secondary',
              minWidth: 'auto',
              p: 0.5,
              fontSize: '0.75rem',
            }}
          >
            <KeyboardDoubleArrowRightIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

