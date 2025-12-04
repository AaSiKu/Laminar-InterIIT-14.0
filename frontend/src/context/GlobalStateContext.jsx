import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWebSocket } from "./WebSocketContext";
import { AuthContext } from "./AuthContext";
import { fetchWorkflows, fetchPreviousNotifcations } from "../utils/utils";

const GlobalStateContext = createContext();
export function useGlobalState() {
  return useContext(GlobalStateContext);
}

export const GlobalStateProvider = ({ children }) => {
  // Initialize state
  const [workflows, setWorkflows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [messageQueue, setMessageQueue] = useState([]); // Queue for messages received while disconnected
  
  const { isAuthenticated, user } = useContext(AuthContext);
  const { ws, isConnected } = useWebSocket();

  // Helper function to check if item exists by _id
  const itemExists = useCallback((array, item) => {
    if (!item || !item._id) return false;
    return array.some(existing => {
      if (existing._id) {
        return String(existing._id) === String(item._id);
      }
      return false;
    });
  }, []);

  // Fetch initial data from APIs
  useEffect(() => {
    if (!isAuthenticated || !user || initialized) {
      return;
    }

    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch fresh data from APIs
        const workflowsResponse = await fetchWorkflows(0, 100);
        if (workflowsResponse.status === "success" && workflowsResponse.data) {
          setWorkflows(workflowsResponse.data);
        }

        // Fetch notifications
        const notificationsData = await fetchPreviousNotifcations();
        if (Array.isArray(notificationsData)) {
          setNotifications(notificationsData);
          
          // Filter alerts from notifications (notifications with type=="alert")
          const allAlerts = notificationsData.filter(notif => notif.type === "alert");
          setAlerts(allAlerts);
        }

        // Logs - commented out for now as they are not implemented
        // const logsData = await fetchLogs();
        // if (Array.isArray(logsData)) {
        //   setLogs(logsData);
        // }

        setInitialized(true);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated, user, initialized]);

  // Process a single WebSocket message
  const processWebSocketMessage = useCallback((data) => {
    const messageType = data.message_type || data.type;

    // Handle workflow updates
    if (messageType === "workflow" && data._id) {
      setWorkflows(prev => {
        // Check if workflow already exists
        const existingIndex = prev.findIndex(w => {
          if (w._id && data._id) return String(w._id) === String(data._id);
          return false;
        });

        if (existingIndex >= 0) {
          // Update existing workflow
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          return updated;
        } else {
          // Add new workflow (avoid duplicates)
          if (!itemExists(prev, data)) {
            return [data, ...prev];
          }
          return prev;
        }
      });
    }

    // Handle notifications (including alerts)
    if (messageType === "notification" || (data.type && data.type !== "workflow" && data.type !== "log")) {
      setNotifications(prev => {
        // Add notification if it doesn't exist
        if (!itemExists(prev, data)) {
          return [data, ...prev];
        }
        return prev;
      });

      // If notification is an alert (type=="alert"), also add to alerts
      if (data.type === "alert") {
        setAlerts(prev => {
          if (!itemExists(prev, data)) {
            return [data, ...prev];
          }
          return prev;
        });
      }
    }

    // Handle logs (commented out for now)
    if (messageType === "log") {
      setLogs(prev => {
        if (!itemExists(prev, data)) {
          return [data, ...prev];
        }
        return prev;
      });
    }
  }, [setWorkflows, setNotifications, setAlerts, itemExists]);

  // Process queued messages when connection is restored
  const processMessageQueue = useCallback(() => {
    if (messageQueue.length > 0) {
      console.log(`Processing ${messageQueue.length} queued messages`);
      messageQueue.forEach((data) => {
        processWebSocketMessage(data);
      });
      setMessageQueue([]);
    }
  }, [messageQueue, processWebSocketMessage]);

  // Handle WebSocket messages - ADD to existing arrays
  useEffect(() => {
    if (!ws) {
      // If WebSocket is null, queue messages
      return;
    }

    const handleMessage = (event) => {
      try {
        let data;
        if (typeof event.data === 'string') {
          data = JSON.parse(event.data);
        } else {
          data = event.data;
        }

        // Ignore ping/pong messages
        if (data.type === "ping" || data.type === "pong" || data.message_type === "ping" || data.message_type === "pong") {
          return;
        }

        // If connected, process immediately; otherwise queue
        if (isConnected) {
          processWebSocketMessage(data);
        } else {
          console.log("WebSocket not connected, queuing message:", data);
          setMessageQueue(prev => {
            const updated = [...prev, data];
            // Limit queue size to prevent memory issues
            return updated.length > 100 ? updated.slice(-100) : updated;
          });
        }
      } catch (error) {
        console.error("Error handling WebSocket message in GlobalStateContext:", error);
      }
    };

    // Add message listener to WebSocket
    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isConnected, processWebSocketMessage, setMessageQueue]);

  // Process queued messages when connection is restored
  useEffect(() => {
    if (isConnected && messageQueue.length > 0) {
      processMessageQueue();
    }
  }, [isConnected, messageQueue, processMessageQueue]);

  const value = {
    // State data
    workflows,
    setWorkflows,
    notifications,
    setNotifications,
    logs,
    setLogs,
    alerts,
    setAlerts,
    loading,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};

