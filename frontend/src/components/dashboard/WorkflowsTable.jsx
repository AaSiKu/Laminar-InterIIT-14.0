import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const WorkflowsTable = ({ workflows }) => {
  return (
    <TableContainer>
      <Table aria-label="workflows table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell>Last opened by me</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {workflows.map((row) => (
            <TableRow
              key={row.id}
              sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { backgroundColor: 'action.hover', cursor: 'pointer' },
              }}
            >
              <TableCell component="th" scope="row">
                <Typography variant="body1" fontWeight="medium">
                  {row.name}
                </Typography>
              </TableCell>
              <TableCell>{row.owner}</TableCell>
              <TableCell>{row.lastModified}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WorkflowsTable;
