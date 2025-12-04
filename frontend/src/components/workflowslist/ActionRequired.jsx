import { Box, Typography, Button, IconButton, useTheme } from "@mui/material";
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import noDataSvg from "../../assets/noData.svg";
dayjs.extend(relativeTime);

const ActionRequired = ({ actionFilter, onFilterChange, notifications = [] }) => {
  const theme = useTheme();

  // Format notification for display
  const formatNotification = (notif) => {
    return {
      id: notif._id || notif.id,
      title: notif.title || notif.desc || "Notification",
      description: notif.desc || notif.title || "",
      type: notif.type,
      timestamp: notif.timestamp,
      timeAgo: notif.timestamp ? dayjs(notif.timestamp).fromNow() : "Unknown",
      action_taken: notif.alert?.action_taken,
      action_executed_by: notif.alert?.action_executed_by,
      action_executed_by_user: notif.action_executed_by_user,
      email: notif.action_executed_by_user?.email,
      assignee: notif.action_executed_by_user ? `Action taken by ${notif.action_executed_by_user.full_name || notif.action_executed_by_user.email}` : undefined,
    };
  };

  const filteredNotifications = notifications.map(formatNotification);

  return (
    <Box 
      sx={{ 
        display: "flex",
        flexDirection: "column",
        bgcolor: 'background.paper',
        border: "1px solid",
        borderColor: 'divider',
        borderRadius: 0,
        borderTop: "none",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "0.9375rem", color: "text.primary" }}>
          Action Required
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant={actionFilter === "notifications" ? "soft" : "text"}
            color="neutral"
            onClick={() => onFilterChange("notifications")}
            sx={{
              minWidth: "auto",
              border: "none",
              '&:hover': {
                border: "none",
              },
            }}
          >
            Notifications
          </Button>
          <Button
            size="small"
            variant={actionFilter === "pending_actions" ? "soft" : "text"}
            color="neutral"
            onClick={() => onFilterChange("pending_actions")}
            sx={{
              minWidth: "auto",
              border: "none",
              '&:hover': {
                border: "none",
              },
            }}
          >
            Pending Actions
          </Button>
          <Button
            size="small"
            variant={actionFilter === "actions_taken" ? "soft" : "text"}
            color="neutral"
            onClick={() => onFilterChange("actions_taken")}
            sx={{
              minWidth: "auto",
              border: "none",
              '&:hover': {
                border: "none",
              },
            }}
          >
            Actions Taken
          </Button>
        </Box>
      </Box>
      <Box 
        sx={{ 
          flex: 1, 
          px: 2,
          pt: 1,
          pb: 3,
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", mb: 0.5, display: "block", textTransform: "capitalize" }}>
          {actionFilter === "notifications" ? "notifications" : actionFilter === "pending_actions" ? "pending actions" : "actions taken"}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filteredNotifications.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
              <Box
                component="img"
                src={noDataSvg}
                alt="No data"
                sx={{ width: "8rem", height: "auto", opacity: 0.6 }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem", mt: 2 }}>
                No items found
              </Typography>
            </Box>
          ) : (
            filteredNotifications.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: "1rem",
                  borderRadius: 2,
                  bgcolor: "background.elevation1",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "text.primary", flex: 1 }}>
                    {item.title}
                  </Typography>
                  <IconButton 
                    size="small" 
                    sx={{ 
                      ml: 1, 
                      p: 0.5,
                      color: 'primary.main',
                      bgcolor: 'rgba(25, 118, 210, 0.08)',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.16)',
                      },
                    }}
                  >
                    <AutoAwesomeOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
                {item.email && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block", mb: 0.5 }}>
                    {item.email}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block", mb: 1 }}>
                  {item.assignee || item.timeAgo}
                </Typography>
                {item.type === "alert" && actionFilter === "pending_actions" && (
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Button 
                      size="small"
                      variant="text"
                      sx={{ 
                        minWidth: "auto",
                        px: 1.5,
                        py: 0.5,
                        color: "primary.main",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        textTransform: "none",
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="small"
                      variant="text"
                      sx={{ 
                        minWidth: "auto",
                        px: 1.5,
                        py: 0.5,
                        color: "error.main",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        textTransform: "none",
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(211, 47, 47, 0.16)' 
                            : 'rgba(211, 47, 47, 0.08)',
                        },
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                )}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ActionRequired;

