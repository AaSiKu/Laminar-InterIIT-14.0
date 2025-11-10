import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';

const NotificationsList = ({ notifications }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No new notifications.</Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'transparent' }}>
      {notifications.map((notification, index) => (
        <React.Fragment key={notification.id}>
          <ListItem alignItems="flex-start">
            <ListItemText
              primary={notification.message}
              secondary={
                <Typography
                  sx={{ display: 'inline' }}
                  component="span"
                  variant="body2"
                  color="text.primary"
                >
                  {notification.timestamp}
                </Typography>
              }
            />
          </ListItem>
          {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default NotificationsList;
