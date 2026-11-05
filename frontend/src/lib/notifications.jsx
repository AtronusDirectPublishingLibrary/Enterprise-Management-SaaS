import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.get("/notifications");
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (e) {
      // Ignore errors if not logged in
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchNotifications();
    // Then poll every 30 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    await api.put(`/notifications/${id}/read`, {});
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await api.put("/notifications/read-all", {});
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}