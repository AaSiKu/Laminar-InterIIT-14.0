import { useState } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const itemsPerPage = 5;

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get current page data
  const getCurrentPageData = () => {
    if (showAll) return data;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const displayedData = getCurrentPageData();
  
  // Calculate empty rows needed to maintain consistent height
  const emptyRows = showAll ? 0 : itemsPerPage - displayedData.length;

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  const handlePageClick = (page) => setCurrentPage(page);
  const handleShowAll = () => {
    setShowAll(!showAll);
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };
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
            {displayedData.map((member) => (
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
            {/* Empty rows to maintain consistent table height */}
            {emptyRows > 0 && Array.from({ length: emptyRows }).map((_, index) => (
              <TableRow
                key={`empty-${index}`}
                sx={{
                  '& .MuiTableCell-root': {
                    borderBottom: 'none',
                    bgcolor: 'transparent',
                    py: 1.75,
                  },
                }}
              >
                <TableCell colSpan={6} sx={{ height: '3.5rem' }} />
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
          <span>
            {showAll 
              ? <>Showing <strong>all {totalItems} items</strong></>
              : <>Showing <strong>page {currentPage} out of {totalPages}</strong></>
            }
          </span>
          <Button
            size="small"
            onClick={handleShowAll}
            sx={{
              color: 'primary.main',
              textTransform: 'none',
              fontSize: '0.75rem',
              p: 0,
              minWidth: 'auto',
            }}
          >
            {showAll ? 'Show less' : 'Show all'}
          </Button>
        </Box>
        {!showAll && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <IconButton
              size="small"
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              sx={{
                color: currentPage === 1 ? 'text.disabled' : 'text.secondary',
                minWidth: 'auto',
                p: 0.5,
                fontSize: '0.75rem',
              }}
            >
              <KeyboardDoubleArrowLeftIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              sx={{
                color: currentPage === 1 ? 'text.disabled' : 'text.secondary',
                minWidth: 'auto',
                p: 0.5,
                fontSize: '0.75rem',
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
            {getPageNumbers().map((page) => (
              <Button
                key={page}
                size="small"
                onClick={() => handlePageClick(page)}
                sx={{
                  bgcolor: currentPage === page ? 'primary.main' : 'transparent',
                  color: currentPage === page ? 'primary.contrastText' : 'text.secondary',
                  minWidth: 'auto',
                  p: 0.5,
                  fontSize: '0.75rem',
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: currentPage === page ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                {page}
              </Button>
            ))}
            <IconButton
              size="small"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              sx={{
                color: currentPage === totalPages ? 'text.disabled' : 'text.secondary',
                minWidth: 'auto',
                p: 0.5,
                fontSize: '0.75rem',
              }}
            >
              <ChevronRightIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleLastPage}
              disabled={currentPage === totalPages}
              sx={{
                color: currentPage === totalPages ? 'text.disabled' : 'text.secondary',
                minWidth: 'auto',
                p: 0.5,
                fontSize: '0.75rem',
              }}
            >
              <KeyboardDoubleArrowRightIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}

