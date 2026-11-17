import React, { useState, useEffect } from "react";

function NotificationCenter({ stats, toasts = [], onDismissToast, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );

  // Generate intelligent smart reminders based on student's live data
  useEffect(() => {
    const alerts = [];
    const now = new Date();

    // 1. Upcoming Exams Alerts
    if (stats?.exams && stats.exams.length > 0) {
      stats.exams.forEach((exam) => {
        alerts.push({
          id: `exam-${exam.id}`,
          type: "exam",
          icon: "📅",
          title: `Upcoming Exam: ${exam.subject}`,
          message: `${exam.type} scheduled on ${exam.date}. Start your revision early!`,
          time: "Scheduled Exam",
          page: "exams",
          read: false
        });
      });
    }

    // 2. High Priority Pending Tasks
    if (stats?.tasks && stats.tasks.length > 0) {
      const urgentTasks = stats.tasks.filter(
        (t) => !t.completed && t.priority === "High"
      );
      urgentTasks.forEach((task) => {
        alerts.push({
          id: `task-${task.id}`,
          type: "task",
          icon: "🚨",
          title: `Urgent Task: ${task.title}`,
          message: `Subject: ${task.subject}. Complete this high-priority assignment today.`,
          time: "High Priority",
          page: "tasks",
          read: false
        });
      });
    }

    // 3. Attendance Shortage Alerts (<75%)
    if (stats?.attendanceChart && stats.attendanceChart.length > 0) {
      const lowAtt = stats.attendanceChart.filter((a) => a.percentage < 75);
      lowAtt.forEach((item, idx) => {
        alerts.push({
          id: `att-${idx}`,
          type: "attendance",
          icon: "⚠️",
          title: `Attendance Warning: ${item.subject}`,
          message: `Current attendance is ${item.percentage}% (<75%). Attend upcoming classes to prevent shortage!`,
          time: "Criteria Shortage",
          page: "attendance",
          read: false
        });
      });
    }

    // 4. General Productivity Tip
    alerts.push({
      id: "ai-tip",
      type: "tip",
      icon: "🤖",
      title: "Daily AI Study Recommendation",
      message: "Ask your AI Academic Assistant to generate today's customized study timetable!",
      time: "Daily Tip",
      page: "ai",
      read: false
    });

    setNotifications(alerts);
    setUnreadCount(alerts.length);
  }, [stats]);

  // Request browser desktop notification permission
  const requestDesktopPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "granted") {
        new Notification("🎓 Student Life OS Notifications Enabled", {
          body: "You will now receive desktop alerts for exams, tasks, and attendance!",
          icon: "/favicon.svg"
        });
      }
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif) => {
    setNotifications(
      notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setIsOpen(false);
    if (onNavigate && notif.page) {
      onNavigate(notif.page);
    }
  };

  return (
    <div className="notification-center-wrapper">
      {/* BELL BUTTON WITH UNREAD COUNTER */}
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="View Reminders & Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {/* NOTIFICATIONS DROPDOWN MENU */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <h3>Reminders & Alerts</h3>
              <span className="notif-count-text">
                {unreadCount} unread reminders
              </span>
            </div>
            <div className="header-notif-actions">
              {unreadCount > 0 && (
                <button className="text-btn" onClick={markAllAsRead}>
                  Mark all read
                </button>
              )}
              <button className="close-dropdown-btn" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {/* DESKTOP NOTIFICATION PROMPT */}
          {permission !== "granted" && (
            <div className="desktop-notif-prompt">
              <span>🔔 Enable Windows/Desktop Alerts</span>
              <button onClick={requestDesktopPermission}>Enable</button>
            </div>
          )}

          {/* NOTIFICATION LIST */}
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notif-msg">All caught up! No active reminders.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? "read" : "unread"} ${notif.type}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-icon-col">{notif.icon}</div>
                  <div className="notif-content-col">
                    <div className="notif-title-row">
                      <h4>{notif.title}</h4>
                      <span className="notif-time">{notif.time}</span>
                    </div>
                    <p>{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TOAST POPUP NOTIFICATIONS (FLOATING ON SCREEN) */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type || "info"}`}>
            <span className="toast-icon">
              {toast.type === "success"
                ? "✅"
                : toast.type === "warning"
                ? "⚠️"
                : toast.type === "error"
                ? "❌"
                : "🔔"}
            </span>
            <div className="toast-body">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              className="toast-close"
              onClick={() => onDismissToast(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationCenter;
