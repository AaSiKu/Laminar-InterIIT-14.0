import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";

export function StatusChip({ status }) {
  const isDone = status === "Done";
  const isActive = status === "Active";
  const chipClass = isDone || isActive ? "done" : status.toLowerCase();

  return (
    <span className={`admin-status-chip ${chipClass}`}>
      {(isDone || isActive) ? (
        <CheckCircleIcon className="admin-status-icon" />
      ) : (
        <WarningIcon className="admin-status-icon" />
      )}
      {status}
    </span>
  );
}

