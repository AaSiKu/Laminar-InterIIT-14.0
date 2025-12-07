import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import TerminalIcon from "@mui/icons-material/Terminal";
import { useGlobalState } from "../../context/GlobalStateContext";

// Slide transition for snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="left" />;
}

const NotificationToast = () => {
  const location = useLocation();
  const { notifications, logs, alerts } = useGlobalState();
  const [toastQueue, setToastQueue] = useState([]);
  const [currentToast, setCurrentToast] = useState(null);
  const [open, setOpen] = useState(false);

  // Track seen notification/log IDs to avoid showing duplicates
  const [seenIds, setSeenIds] = useState(new Set());
  
  // Track if initial data has been loaded (to avoid showing toasts for pre-existing items)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Check if we're on the overview page
  const isOverviewPage = location.pathname === "/overview";

  // Get icon and color based on notification type
  const getToastStyle = (type, isLog = false) => {
    if (isLog) {
      return {
        icon: <TerminalIcon />,
        severity: "info",
        title: "Log Message",
        color: "info",
      };
    }

    switch (type) {
      case "error":
        return {
          icon: <ErrorOutlineIcon />,
          severity: "error",
          title: "Error",
          color: "error",
        };
      case "warning":
        return {
          icon: <WarningAmberIcon />,
          severity: "warning",
          title: "Warning",
          color: "warning",
        };
      case "success":
        return {
          icon: <CheckCircleOutlineIcon />,
          severity: "success",
          title: "Success",
          color: "success",
        };
      case "alert":
        return {
          icon: <NotificationsActiveIcon />,
          severity: "warning",
          title: "Alert",
          color: "warning",
        };
      case "info":
      default:
        return {
          icon: <InfoOutlinedIcon />,
          severity: "info",
          title: "Notification",
          color: "info",
        };
    }
  };

  // Handle new logs - always show popup (but not for initially loaded logs)
  useEffect(() => {
    if (logs.length > 0) {
      // On first load, mark all existing logs as seen without showing toasts
      if (!initialLoadComplete) {
        const allLogIds = logs.map(log => log._id || `log-${log.timestamp || Date.now()}`);
        setSeenIds(prev => new Set([...prev, ...allLogIds]));
        return;
      }
      
      const latestLog = logs[0];
      const logId = latestLog._id || `log-${latestLog.timestamp || Date.now()}`;

      if (!seenIds.has(logId)) {
        setSeenIds((prev) => new Set([...prev, logId]));
        setToastQueue((prev) => [
          ...prev,
          {
            id: logId,
            type: "log",
            data: latestLog,
            isLog: true,
          },
        ]);
      }
    }
  }, [logs, seenIds, initialLoadComplete]);

  // Handle new notifications/alerts - show popup only if NOT on overview page (and not for initially loaded notifications)
  useEffect(() => {
    if (notifications.length > 0) {
      // On first load, mark all existing notifications as seen without showing toasts
      if (!initialLoadComplete) {
        const allNotifIds = notifications.map(n => n._id || `notif-${n.timestamp || Date.now()}`);
        setSeenIds(prev => new Set([...prev, ...allNotifIds]));
        // Mark initial load complete after a short delay to ensure all data is processed
        setTimeout(() => setInitialLoadComplete(true), 500);
        return;
      }
      
      if (!isOverviewPage) {
        const latestNotification = notifications[0];
        const notifId =
          latestNotification._id ||
          `notif-${latestNotification.timestamp || Date.now()}`;

        if (!seenIds.has(notifId)) {
          setSeenIds((prev) => new Set([...prev, notifId]));
          setToastQueue((prev) => [
            ...prev,
            {
              id: notifId,
              type: latestNotification.type || "info",
              data: latestNotification,
              isLog: false,
            },
          ]);
        }
      }
    }
  }, [notifications, isOverviewPage, seenIds, initialLoadComplete]);

  // Process toast queue - show next toast when current one closes
  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setCurrentToast(nextToast);
      setToastQueue((prev) => prev.slice(1));
      setOpen(true);
    }
  }, [currentToast, toastQueue]);

  // Handle close
  const handleClose = useCallback((event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  }, []);

  // Handle toast exit - prepare for next toast
  const handleExited = useCallback(() => {
    setCurrentToast(null);
  }, []);

  if (!currentToast) {
    return null;
  }

  const { data, type, isLog } = currentToast;
  const style = getToastStyle(type, isLog);

  // Build message content
  let title = style.title;
  let message = "";

  if (isLog) {
    title = `Log: ${data.level?.toUpperCase() || "INFO"}`;
    message = data.message || "New log entry received";
    if (data.source) {
      message = `[${data.source}] ${message}`;
    }
  } else {
    title = data.title || style.title;
    message = data.desc || data.description || "";
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={isLog ? 4000 : 6000}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      TransitionProps={{ onExited: handleExited }}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      sx={{ mt: 8 }}
    >
      <Alert
        severity={style.severity}
        variant="filled"
        onClose={handleClose}
        icon={style.icon}
        sx={{
          minWidth: 300,
          maxWidth: 400,
          boxShadow: 6,
          "& .MuiAlert-message": {
            width: "100%",
          },
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {message}
        </Typography>
        {data.pipeline_id && (
          <Typography
            variant="caption"
            sx={{ mt: 0.5, display: "block", opacity: 0.8 }}
          >
            Pipeline: {data.pipeline_id}
          </Typography>
        )}
      </Alert>
    </Snackbar>
  );
};

export default NotificationToast;
