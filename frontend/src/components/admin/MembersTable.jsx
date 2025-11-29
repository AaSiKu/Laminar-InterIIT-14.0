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
import SearchIcon from "@mui/icons-material/Search";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { StatusChip } from "./StatusChip";

export function MembersTable({ data }) {
  return (
    <div className="admin-members-section">
      <div className="admin-section-header">
        <div>
          <Typography className="admin-section-title">Members</Typography>
          <Typography className="admin-section-subtitle">
            Current status of all hiring pipelines
          </Typography>
        </div>
        <div className="admin-search-positions-wrapper">
          <SearchIcon className="admin-search-positions-icon" />
          <input
            type="text"
            placeholder="Search Positions"
            className="admin-search-positions"
          />
        </div>
      </div>
      <TableContainer className="admin-table-container">
        <Table className="admin-table" size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Access</TableCell>
              <TableCell>Env. Access</TableCell>
              <TableCell>Assigned Pipelines</TableCell>
              <TableCell>Status</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="admin-member-info">
                    <div className="admin-member-avatar">
                      <img src={`https://i.pravatar.cc/40?img=${member.id + 20}`} alt={member.name} />
                    </div>
                    <div>
                      <Typography className="admin-member-name">{member.name}</Typography>
                      <Typography className="admin-member-code">{member.code}</Typography>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="admin-access-badge">{member.access}</span>
                </TableCell>
                <TableCell>
                  <span className="admin-env-access">{member.envAccess}</span>
                </TableCell>
                <TableCell>
                  <span className="admin-pipelines-count">
                    {member.assignedPipelines.toString().padStart(2, "0")}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusChip status={member.status} />
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <MoreHorizIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
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
        <div className="admin-pagination">
          <IconButton className="admin-pagination-btn" size="small">
            <KeyboardDoubleArrowLeftIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton className="admin-pagination-btn" size="small">
            <ChevronLeftIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <Button className="admin-pagination-btn active">1</Button>
          <Button className="admin-pagination-btn">2</Button>
          <Button className="admin-pagination-btn">3</Button>
          <IconButton className="admin-pagination-btn" size="small">
            <ChevronRightIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton className="admin-pagination-btn" size="small">
            <KeyboardDoubleArrowRightIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

