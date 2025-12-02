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
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { AvatarStack } from "./AvatarStack";
import { StatusChip } from "./StatusChip";

export function WorkflowsTable({ data }) {
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

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  const handleShowAll = () => {
    setShowAll(!showAll);
    setCurrentPage(1);
  };

  return (
    <Box
      className="admin-workflows-section"
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
            Workflows
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              mt: 0.125,
            }}
          >
            Total No. of Pipeline running {totalItems}
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <MoreHorizIcon />
        </IconButton>
      </Box>
      <TableContainer
        sx={{
          boxShadow: 'none',
        }}
      >
        <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
          <TableHead>
            <TableRow>
              <TableCell
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
                Workflow
              </TableCell>
              <TableCell
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
                Members
              </TableCell>
              <TableCell
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
                Last Activity
              </TableCell>
              <TableCell
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
                State
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedData.map((workflow) => (
              <TableRow
                key={workflow.id}
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
                  <Typography
                    sx={{
                      color: 'text.primary',
                      fontWeight: 500,
                    }}
                  >
                    {workflow.name}
                  </Typography>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <AvatarStack count={workflow.members.length} />
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                    color: 'text.primary',
                  }}
                >
                  {workflow.lastActivity}
                </TableCell>
                <TableCell
                  sx={{
                    py: 1.75,
                    fontSize: '0.875rem',
                  }}
                >
                  <StatusChip status={workflow.state} />
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
                <TableCell colSpan={4} sx={{ height: '3.5rem' }} />
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
            <Button
              size="small"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                color: currentPage === 1 ? 'text.disabled' : 'text.secondary',
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
              Previous
            </Button>
            <Button
              size="small"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                color: currentPage === totalPages ? 'text.disabled' : 'primary.main',
              }}
            >
              Next
              <ChevronRightIcon sx={{ fontSize: "1rem" }} />
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
