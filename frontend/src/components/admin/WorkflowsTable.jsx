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
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { AvatarStack } from "./AvatarStack";
import { StatusChip } from "./StatusChip";

export function WorkflowsTable({ data }) {
  return (
    <div className="admin-workflows-section">
      <div className="admin-section-header">
        <div>
          <Typography className="admin-section-title">Workflows</Typography>
          <Typography className="admin-section-subtitle">
            Total No. of Pipeline running 35
          </Typography>
        </div>
        <IconButton className="admin-more-btn" size="small">
          <MoreHorizIcon />
        </IconButton>
      </div>
      <TableContainer className="admin-table-container">
        <Table className="admin-table" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Workflow</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Last Activity</TableCell>
              <TableCell>State</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <span className="admin-workflow-name">{workflow.name}</span>
                </TableCell>
                <TableCell>
                  <AvatarStack count={workflow.members.length} />
                </TableCell>
                <TableCell>{workflow.lastActivity}</TableCell>
                <TableCell>
                  <StatusChip status={workflow.state} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="admin-table-footer">
        <div className="admin-showing-info">
          <span>Showing <strong>5 out of 12</strong> items</span>
          <Button className="admin-show-all-btn">Show all</Button>
        </div>
        <div className="admin-pagination-nav">
          <Button className="admin-prev-btn" disabled>
            <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
            Previous
          </Button>
          <Button className="admin-next-btn">
            Next
            <ChevronRightIcon sx={{ fontSize: "1rem" }} />
          </Button>
        </div>
      </div>
    </div>
  );
}

