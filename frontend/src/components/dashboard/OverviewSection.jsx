import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const OverviewSection = ({ data }) => {
  // Chart data - all segments with uniform thickness
  console.log("car", data)
  const chartData = [
    { 
      name: 'Running', 
      value: data?.running || 25000, 
      color: '#86C8BC',
    },
    
    { 
      name: 'Broken', 
      value: data?.broken || 2000, 
      color: '#F0B4C4',
    },
  ];

  const total = data?.total; // Total count as shown in the image
  
  return (
    <Paper
      sx={{
        p: 5,
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: 'none',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
            Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Current state of workflows
          </Typography>
        </Box>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#f9fafb' },
          }}
        >
          <MoreHorizIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        </Box>
      </Box>

      {/* Semicircle Donut Chart */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', mb: 2, mt: 3 }}>
        <Box sx={{ position: 'relative', width: 320, height: 160 }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight="700" sx={{ fontSize: '2rem' }}>
              {total}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Total
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 6 }}>
        {chartData.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 4,
                  height: 36,
                  bgcolor: item.color,
                  borderRadius: '2px',
                }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" fontWeight="600">
                  {item.value.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default OverviewSection;

