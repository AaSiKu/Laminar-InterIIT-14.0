import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Switch,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import AutorenewIcon from '@mui/icons-material/Autorenew';

const NodeDataTable = ({ nodeId, isVisible, nodeRef, onMouseEnter, onMouseLeave }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [columns, setColumns] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [position, setPosition] = useState({ top: '100%', left: '0', right: 'auto', bottom: 'auto' });
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [countdown, setCountdown] = useState(10);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const REFRESH_INTERVAL = 10000; // 10 seconds
  const intervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const tableRef = useRef(null);
  const serverUrl = import.meta.env.VITE_POSTGRES_SERVER;
  // Fetch data from API
  const fetchData = useCallback(async (startRow = 0) => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const limit = rowsPerPage;
      const url = `${serverUrl}/api/node-data/${nodeId}?start_row=${startRow}&limit=${limit}`;
      
      console.log(`Fetching data: startRow=${startRow}, limit=${limit}, rowsPerPage=${rowsPerPage}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`Received ${result.data?.length || 0} rows, total: ${result.total_rows}`);
      
      setData(result.data || []);
      setTotalRows(result.total_rows || 0);
      setHasMore(result.has_more || false);
      setCountdown(10); // Reset countdown after fetch
      
      // Extract columns from first row
      if (result.data && result.data.length > 0) {
        setColumns(Object.keys(result.data[0]));
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isVisible, rowsPerPage, nodeId]);

  // Handle page navigation
  const handleNext = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setCountdown(10); // Reset countdown
    const startRow = nextPage * rowsPerPage;
    fetchData(startRow);
  };

  const handlePrevious = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const prevPage = Math.max(0, currentPage - 1);
    setCurrentPage(prevPage);
    setCountdown(10); // Reset countdown
    const startRow = prevPage * rowsPerPage;
    fetchData(startRow);
  };

  const handleRefresh = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCountdown(10); // Reset countdown on manual refresh
    const startRow = currentPage * rowsPerPage;
    fetchData(startRow);
  };

  const handleRowsPerPageChange = (newValue) => {
    setDropdownOpen(false); // Close dropdown
    setCurrentPage(0); // Reset to first page
    setRowsPerPage(newValue); // This will trigger the useEffect to fetch data
    // Note: No manual fetch here - let useEffect handle it to avoid race conditions
    // Countdown will be reset by fetchData after successful fetch
  };

  const handleAutoRefreshToggle = (e) => {
    e.stopPropagation();
    const newValue = e.target.checked;
    setAutoRefresh(newValue);
    if (newValue) {
      setCountdown(10); // Reset countdown when turning on auto-refresh
    }
  };

  // Calculate optimal table position based on node location
  const calculatePosition = () => {
    if (!nodeRef?.current) return;

    const nodeRect = nodeRef.current.getBoundingClientRect();
    const tableWidth = 640; // 40rem approximate
    const tableHeight = 400; // Approximate table height
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate available space in each direction
    const spaceRight = viewportWidth - nodeRect.right;
    const spaceLeft = nodeRect.left;
    const spaceBelow = viewportHeight - nodeRect.bottom;
    const spaceAbove = nodeRect.top;
    
    // Calculate which quadrant the node is in
    const isLeftHalf = nodeRect.left < viewportWidth / 2;
    const isTopHalf = nodeRect.top < viewportHeight / 2;
    
    let newPosition = {};
    
    // Priority: Try horizontal placement first (left or right of node)
    if (spaceRight >= tableWidth && (isLeftHalf || spaceRight > spaceLeft)) {
      // Place on RIGHT side of node
      newPosition.left = '100%';
      newPosition.right = 'auto';
      // Align bottom edges if node is in bottom half
      if (!isTopHalf) {
        newPosition.bottom = '0';
        newPosition.top = 'auto';
      } else {
        newPosition.top = '0';
        newPosition.bottom = 'auto';
      }
    } else if (spaceLeft >= tableWidth && (!isLeftHalf || spaceLeft > spaceRight)) {
      // Place on LEFT side of node
      newPosition.right = '100%';
      newPosition.left = 'auto';
      // Align bottom edges if node is in bottom half
      if (!isTopHalf) {
        newPosition.bottom = '0';
        newPosition.top = 'auto';
      } else {
        newPosition.top = '0';
        newPosition.bottom = 'auto';
      }
    } else if (spaceBelow >= tableHeight && (isTopHalf || spaceBelow > spaceAbove)) {
      // Place BELOW node (table top touches node bottom)
      newPosition.top = '100%';
      newPosition.bottom = 'auto';
      newPosition.left = '0';
      newPosition.right = 'auto';
    } else {
      // Place ABOVE node (table bottom touches node top)
      newPosition.bottom = '100%';
      newPosition.top = 'auto';
      newPosition.left = '0';
      newPosition.right = 'auto';
    }
    
    setPosition(newPosition);
  };

  // Calculate position when table becomes visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  // Setup auto-refresh
  useEffect(() => {
    if (!isVisible) {
      // Clear interval when not visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval before setting up new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Initial fetch
    const startRow = currentPage * rowsPerPage;
    fetchData(startRow);

    // Setup auto-refresh only if enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        const startRow = currentPage * rowsPerPage;
        fetchData(startRow);
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible, currentPage, autoRefresh, rowsPerPage, fetchData]);

  // Setup countdown timer (only when auto-refresh is enabled)
  useEffect(() => {
    if (!isVisible || !autoRefresh) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    // Clear any existing countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 10; // Reset to 10 when it reaches 0
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isVisible, autoRefresh]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  if (!isVisible) return null;

  return (
    <div 
      onClick={(e) => {
        // Don't stop propagation if clicking on the select or its children
        if (!e.target.closest('.MuiSelect-root') && !e.target.closest('.MuiFormControl-root')) {
          e.stopPropagation();
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ position: 'absolute', ...position, zIndex: 9999 }}
    >
      <Paper
        ref={tableRef}
        elevation={8}
        sx={{
          p: '1rem',
          minWidth: '40rem',
          maxWidth: '60rem',
          zIndex: 9999,
          backgroundColor: '#fff',
          borderRadius: '0.5rem',
          boxShadow: '0 0.5rem 2rem rgba(0,0,0,0.15)',
        }}
      >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '1rem' }}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Node Data: {nodeId}
          </Typography>
          {autoRefresh && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Updating in {countdown} seconds
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tooltip title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <AutorenewIcon sx={{ fontSize: '1rem', color: autoRefresh ? '#3b82f6' : '#9e9e9e' }} />
              <Switch
                checked={autoRefresh}
                onChange={handleAutoRefreshToggle}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#3b82f6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#3b82f6',
                  },
                }}
              />
            </Box>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={loading} 
              size="small"
            >
              <RefreshIcon sx={{ fontSize: '1.25rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer sx={{ 
        maxHeight: '20rem', 
        mb: '1rem', 
        overflowX: 'scroll',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          height: '0.375rem',
          width: '0.375rem',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f5f5f5',
          borderRadius: '0.25rem',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#d1d5db',
          borderRadius: '0.25rem',
          '&:hover': {
            backgroundColor: '#9ca3af',
          },
        },
      }}>
        {loading && data.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: '2rem' }}>
            <CircularProgress size="2rem" />
          </Box>
        ) : error ? (
          <Box sx={{ p: '2rem', textAlign: 'center' }}>
            <Typography color="error" sx={{ fontSize: '0.875rem' }}>{error}</Typography>
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ p: '2rem', textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>No data available</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: '#f5f5f5' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} hover>
                  {columns.map((col) => (
                    <TableCell key={col} sx={{ fontSize: '0.75rem' }}>
                      {typeof row[col] === 'object' && row[col] !== null
                        ? JSON.stringify(row[col])
                        : String(row[col] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
            {rowsPerPage >= totalRows
              ? `Showing all ${totalRows} rows`
              : `Showing rows ${currentPage * rowsPerPage + 1} - ${Math.min((currentPage + 1) * rowsPerPage, totalRows)} of ${totalRows}`
            }
          </Typography>
          <div
            ref={dropdownRef}
            style={{ position: 'relative', display: 'inline-block' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                fontSize: '0.75rem',
                height: '1.75rem',
                minWidth: '5.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #e5e7eb',
                padding: '0 0.5rem',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
              }}
            >
              <span>{rowsPerPage}</span>
              <span style={{ marginLeft: '0.25rem', fontSize: '0.6rem' }}>▲</span>
            </div>
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '0.25rem',
                  minWidth: '5.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  boxShadow: '0 0.25rem 0.5rem rgba(0,0,0,0.1)',
                  zIndex: 10000,
                  maxHeight: '12rem',
                  overflowY: 'auto',
                }}
              >
                {[5, 10, 20, 100].map((option) => (
                  <div
                    key={option}
                    onClick={() => handleRowsPerPageChange(option)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      backgroundColor: rowsPerPage === option ? '#f3f4f6' : '#fff',
                      color: '#374151',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      if (rowsPerPage !== option) {
                        e.currentTarget.style.backgroundColor = '#fff';
                      }
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Box>
        <Box sx={{ display: 'flex', gap: '0.5rem' }}>
          <Tooltip title={`Previous ${rowsPerPage >= totalRows ? '' : rowsPerPage} rows`}>
            <span>
              <IconButton
                onClick={handlePrevious}
                disabled={currentPage === 0 || loading || rowsPerPage >= totalRows}
                size="small"
                sx={{
                  border: '0.0625rem solid #e5e7eb',
                  borderRadius: '0.375rem',
                }}
              >
                <NavigateBeforeIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Next ${rowsPerPage >= totalRows ? '' : rowsPerPage} rows`}>
            <span>
              <IconButton
                onClick={handleNext}
                disabled={!hasMore || loading || rowsPerPage >= totalRows}
                size="small"
                sx={{
                  border: '0.0625rem solid #e5e7eb',
                  borderRadius: '0.375rem',
                }}
              >
                <NavigateNextIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
    </div>
  );
};

export default NodeDataTable;


