import { Typography } from "@mui/material";

export function KpiCard({ title, value, description, icon: Icon, iconClass, cardClass, onClick, isSelected }) {
  return (
    <div 
      className={`admin-kpi-card ${cardClass || ""} ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="admin-kpi-header">
        <Typography className="admin-kpi-title">{title}</Typography>
        <div className={`admin-kpi-icon ${iconClass}`}>
          <Icon sx={{ fontSize: "1.25rem" }} />
        </div>
      </div>
      <Typography className="admin-kpi-value">{value}</Typography>
      <Typography className="admin-kpi-description">{description}</Typography>
    </div>
  );
}

