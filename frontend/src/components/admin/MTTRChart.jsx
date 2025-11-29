import { Typography } from "@mui/material";

export function MTTRChart({ data }) {
  const maxValue = 60;
  const minValue = 0;
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const xStep = innerWidth / (data.labels.length - 1);
  
  const getY = (value) => {
    return padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
  };
  
  const getPath = (values) => {
    return values.map((val, i) => {
      const x = padding.left + i * xStep;
      const y = getY(val);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="admin-alerts-section">
      <div className="admin-mttr-chart">
        <Typography className="admin-mttr-title">MTTR</Typography>
        <Typography className="admin-mttr-subtitle">Total profit gained</Typography>
        
        <div className="admin-mttr-chart-container">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="admin-mttr-svg">
            {/* Grid lines */}
            {[60, 45, 30, 15].map((val) => (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={getY(val)}
                  x2={chartWidth - padding.right}
                  y2={getY(val)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={getY(val) + 4}
                  fill="#9ca3af"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            ))}
            
            {/* Vertical grid lines */}
            {data.labels.map((label, i) => (
              <line
                key={i}
                x1={padding.left + i * xStep}
                y1={padding.top}
                x2={padding.left + i * xStep}
                y2={chartHeight - padding.bottom}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Border */}
            <rect
              x={padding.left}
              y={padding.top}
              width={innerWidth}
              height={innerHeight}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            
            {/* Lines */}
            {data.datasets.map((dataset, idx) => (
              <path
                key={idx}
                d={getPath(dataset.values)}
                fill="none"
                stroke={dataset.color}
                strokeWidth="2"
              />
            ))}
            
            {/* X-axis labels */}
            {data.labels.map((label, i) => (
              <text
                key={i}
                x={padding.left + i * xStep}
                y={chartHeight - 10}
                fill="#6b7280"
                fontSize="9"
                textAnchor="middle"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

