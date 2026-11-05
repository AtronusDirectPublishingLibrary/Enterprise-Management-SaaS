import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { useNotifications } from "../lib/notifications";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (n) => {
    if (!n.read) await markAsRead(n.id);
    setIsOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button className="btn btn-link text-dark position-relative p-2" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} color="red" />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "0.6rem" }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="position-absolute end-0 mt-2 bg-white border rounded shadow-lg" style={{ width: 320, zIndex: 1050 }}>
          <div className="d-flex justify-content-between align-items-center p-2 border-bottom bg-light">
            <span className="fw-bold" style={{ fontSize: "0.85rem" }}>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-link text-decoration-none p-0" style={{ fontSize: "0.75rem" }} onClick={markAllAsRead}>
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div className="p-3 text-center text-muted" style={{ fontSize: "0.85rem" }}>No notifications</div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-2 border-bottom ${!n.read ? 'bg-light' : ''}`} 
                  style={{ cursor: "pointer", fontSize: "0.85rem" }}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="fw-bold mb-1">{n.title}</div>
                  {n.body && <div className="text-muted text-truncate">{n.body}</div>}
                  <div className="text-muted mt-1" style={{ fontSize: "0.7rem" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}