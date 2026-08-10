import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { notificationApi } from "../api/api";
import Navbar from "../components/Navbar";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.getMy();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SUCCESS": return <CheckCircle size={20} className="notif-icon success" />;
      case "WARNING": return <AlertTriangle size={20} className="notif-icon warning" />;
      case "ALERT": return <AlertCircle size={20} className="notif-icon alert" />;
      default: return <Info size={20} className="notif-icon info" />;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <Bell size={28} className="page-icon" />
            <div>
              <h1>Notifications</h1>
              <p>{unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={handleMarkAllRead}>
              <CheckCheck size={16} /> Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading notifications...</p></div>
        ) : notifications.length === 0 ? (
          <div className="empty-page">
            <Bell size={64} className="empty-icon" />
            <h3>No notifications yet</h3>
            <p>You'll see placement updates, interview reminders, and more here.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map(n => (
              <div key={n.id} className={`notification-card ${n.isRead ? "read" : "unread"}`}>
                <div className="notif-left">
                  {getTypeIcon(n.type)}
                  <div className="notif-content">
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                  </div>
                </div>
                {!n.isRead && (
                  <button className="notif-mark-btn" onClick={() => handleMarkRead(n.id)} title="Mark as read">
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
