import { Typography } from "@mui/material";

export function SLAComplianceChart({ data }) {
  const size = 180;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke-dasharray for each segment
  let currentOffset = 0;
  const segments = data.donutSegments.map((segment) => {
    const dashLength = (segment.percent / 100) * circumference;
    const offset = currentOffset;
    currentOffset += dashLength;
    return { ...segment, dashLength, offset };
  });

  return (
    <div className="admin-alerts-section">
      <Typography className="admin-sla-title">SLA compliance(%)</Typography>
      
      <div className="admin-sla-content">
        <div className="admin-sla-stats">
          {data.stats.map((stat, idx) => (
            <div key={idx} className="admin-sla-stat-row">
              <div className="admin-sla-stat-indicator" style={{ backgroundColor: stat.color }}></div>
              <span className="admin-sla-stat-label">{stat.label}</span>
              <span className="admin-sla-stat-value">{stat.value}</span>
              <span className="admin-sla-stat-change">
                {stat.change}
                <span className="admin-sla-stat-x">×</span>
              </span>
            </div>
          ))}
        </div>
        
        <div className="admin-sla-donut">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            
            {/* Segments */}
            {segments.map((segment, idx) => (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
                strokeDashoffset={-segment.offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="admin-sla-donut-center">
            <span className="admin-sla-donut-value">{data.overall}%</span>
            <span className="admin-sla-donut-label">SLA Compliance Insight</span>
          </div>
        </div>
      </div>
    </div>
  );
}

