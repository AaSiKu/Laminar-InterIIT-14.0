import React from 'react';
import { Box, Typography, Card, CardContent, CardActionArea } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const TemplateSection = ({ templates }) => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Start a new workflow
      </Typography>
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: 3,
          py: 2,
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          },
        }}
      >
        {/* Custom Workflow Card */}
        <Card variant="outlined" sx={{ minWidth: 220, height: 160 }}>
          <CardActionArea sx={{ height: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <AddIcon color="primary" sx={{ fontSize: '40px' }} />
              <Typography variant="subtitle1" sx={{ mt: 1 }}>
                Custom Workflow
              </Typography>
            </Box>
          </CardActionArea>
        </Card>

        {/* Predefined Template Cards */}
        {templates.slice(1).map((template) => (
          <Card key={template.id} variant="outlined" sx={{ minWidth: 220, height: 160 }}>
            <CardActionArea sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  height: '70%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.200',
                }}
              >
                <AccountTreeIcon sx={{ color: 'grey.500', fontSize: '48px' }} />
              </Box>
              <CardContent sx={{ height: '30%', width: '100%', py: 1 }}>
                <Typography variant="body1" noWrap>
                  {template.name}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default TemplateSection;
