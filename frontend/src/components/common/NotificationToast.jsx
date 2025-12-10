import { useState, useEffect, useCallback, useRef } from "react";
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
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import { useGlobalState } from "../../context/GlobalStateContext";

// Slide transition for snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="left" />;
}

// Helper to extract ID from MongoDB extended JSON or regular format
const extractId = (item, prefix) => {
  if (!item) return `${prefix}-${Date.now()}`;
  
  // Handle MongoDB extended JSON format: {$oid: "..."}
  if (item._id && typeof item._id === 'object' && item._id.$oid) {
    return item._id.$oid;
  }
  // Handle regular string _id
  if (item._id && typeof item._id === 'string') {
    return item._id;
  }
  // Fallback to timestamp
  const timestamp = item.timestamp?.$date || item.timestamp || Date.now();
  return `${prefix}-${timestamp}`;
};

const NotificationToast = () => {
  const location = useLocation();
  const { notifications, logs, alerts, rcaEvents } = useGlobalState();
  const [toastQueue, setToastQueue] = useState([]);
  const [currentToast, setCurrentToast] = useState(null);
  const [open, setOpen] = useState(false);

  // Track seen notification/log IDs to avoid showing duplicates (using ref to avoid infinite loops)
  const seenIdsRef = useRef(new Set());
  
  // Track if initial data has been loaded (to avoid showing toasts for pre-existing items)
  const initialLoadCompleteRef = useRef(false);

  // Mark initial load complete after a short delay (to skip showing toasts for pre-existing data)
  useEffect(() => {
    const timer = setTimeout(() => {
      initialLoadCompleteRef.current = true;
    }, 1000); // Wait 1 second for initial data to load
    return () => clearTimeout(timer);
  }, []);

  // Check if we're on the overview page
  const isOverviewPage = location.pathname === "/overview";

  // Get icon and color based on notification type
  const getToastStyle = (type, isLog = false, isRca = false) => {
    if (isRca) {
      return {
        icon: <TroubleshootIcon />,
        severity: "warning",
        title: "RCA Event",
        color: "warning",
      };
    }
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
      if (!initialLoadCompleteRef.current) {
        logs.forEach(log => {
          const logId = extractId(log, 'log');
          seenIdsRef.current.add(logId);
        });
        return;
      }
      
      const latestLog = logs[0];
      const logId = extractId(latestLog, 'log');

      if (!seenIdsRef.current.has(logId)) {
        seenIdsRef.current.add(logId);
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
  }, [logs]); // Only depend on logs

  // Handle new notifications/alerts - show popup only if NOT on overview page (and not for initially loaded notifications)
  useEffect(() => {
    if (notifications.length > 0) {
      // On first load, mark all existing notifications as seen without showing toasts
      if (!initialLoadCompleteRef.current) {
        notifications.forEach(n => {
          const notifId = extractId(n, 'notif');
          seenIdsRef.current.add(notifId);
        });
        return;
      }
      
      if (!isOverviewPage) {
        const latestNotification = notifications[0];
        const notifId = extractId(latestNotification, 'notif');

        if (!seenIdsRef.current.has(notifId)) {
          seenIdsRef.current.add(notifId);
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
  }, [notifications, isOverviewPage]); // Only depend on notifications and isOverviewPage

  // Handle new RCA events - always show popup (but not for initially loaded RCA events)
  useEffect(() => {
    if (rcaEvents && rcaEvents.length > 0) {
      // On first load, mark all existing RCA events as seen without showing toasts
      if (!initialLoadCompleteRef.current) {
        rcaEvents.forEach(rca => {
          const rcaId = extractId(rca, 'rca');
          seenIdsRef.current.add(rcaId);
        });
        return;
      }
      
      const latestRca = rcaEvents[0];
      const rcaId = extractId(latestRca, 'rca');

      if (!seenIdsRef.current.has(rcaId)) {
        seenIdsRef.current.add(rcaId);
        setToastQueue((prev) => [
          ...prev,
          {
            id: rcaId,
            type: "rca",
            data: latestRca,
            isLog: false,
            isRca: true,
          },
        ]);
      }
    }
  }, [rcaEvents]); // Only depend on rcaEvents

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

  const { data, type, isLog, isRca } = currentToast;
  const style = getToastStyle(type, isLog, isRca);

  // Build message content
  let title = style.title;
  let message = "";

  if (isRca) {
    title = `RCA: ${data.level?.toUpperCase() || "INFO"}`;
    message = data.message || "Root Cause Analysis event";
    if (data.source || data.module) {
      message = `[${data.source || data.module}] ${message}`;
    }
  } else if (isLog) {
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
      autoHideDuration={isLog ? 4000 : isRca ? 5000 : 6000}
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
