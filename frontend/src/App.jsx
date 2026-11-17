import { useState, useEffect } from "react";
import "./App.css";

import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Exams from "./pages/Exams";
import Attendance from "./pages/Attendance";
import AIAssistant from "./pages/AIAssistant";
import AuthModal from "./components/AuthModal";
import ReportModal from "./components/ReportModal";
import AnalyticsCharts from "./components/AnalyticsCharts";
import NotificationCenter from "./components/NotificationCenter";
import { api } from "./api/api";

function App() {
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("student_os_theme") || "light");
  const [user, setUser] = useState(() => api.getCurrentUser() || { name: "Saksham", email: "demo@student.edu" });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    upcomingExamsCount: 0,
    overallAttendance: 0,
    productivity: 0,
    tasks: [],
    exams: [],
    attendanceChart: [],
    priorityDistribution: { High: 0, Medium: 0, Low: 0 }
  });
  const [loading, setLoading] = useState(false);

  // Toast notification helper
  const addToast = (title, message, type = "info") => {
    const id = Date.now() + Math.random();
    const newToast = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Send native desktop notification if permitted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`🎓 ${title}`, { body: message });
      } catch (e) {
        console.error("Desktop notification error:", e);
      }
    }

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("student_os_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Proactive initial reminder
    const timer = setTimeout(() => {
      addToast(
        "📅 Welcome Back!",
        "You have upcoming exams & pending coursework. Check your reminders!",
        "info"
      );
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (page === "dashboard") {
      fetchStats();
    }
  }, [page, user]);

  const handleToggleTask = async (taskId) => {
    try {
      const updated = await api.toggleTask(taskId);
      fetchStats();
      addToast(
        updated.completed ? "Task Completed! 🎉" : "Task Re-opened",
        `"${updated.title}" status updated.`,
        updated.completed ? "success" : "info"
      );
    } catch (err) {
      console.error("Error toggling task:", err);
      addToast("Error", "Could not toggle task status", "error");
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    fetchStats();
    addToast("Signed In", `Welcome, ${userData.name}! Your workspace is synced.`, "success");
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAuthOpen(true);
    addToast("Signed Out", "You have been logged out successfully.", "info");
  };

  return (
    <div className={`app theme-${theme}`}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2 className="logo">🎓 Student Life OS</h2>
          <div className="theme-toggle-container">
            <button className="theme-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </button>
          </div>
        </div>

        <nav>
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            🏠 Dashboard
          </button>

          <button
            className={page === "tasks" ? "active" : ""}
            onClick={() => setPage("tasks")}
          >
            📝 Tasks
          </button>

          <button
            className={page === "notes" ? "active" : ""}
            onClick={() => setPage("notes")}
          >
            📚 Notes
          </button>

          <button
            className={page === "exams" ? "active" : ""}
            onClick={() => setPage("exams")}
          >
            📅 Exams
          </button>

          <button
            className={page === "attendance" ? "active" : ""}
            onClick={() => setPage("attendance")}
          >
            📊 Attendance
          </button>

          <button
            className={page === "ai" ? "active" : ""}
            onClick={() => setPage("ai")}
          >
            🤖 AI Assistant
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-sidebar-card">
            <div className="user-avatar">👤</div>
            <div className="user-info">
              <strong>{user?.name || "Student"}</strong>
              <small>{user?.email || "Guest"}</small>
            </div>
          </div>

          <div className="sidebar-actions">
            {user ? (
              <button className="auth-btn logout" onClick={handleLogout}>
                🚪 Sign Out
              </button>
            ) : (
              <button className="auth-btn login" onClick={() => setIsAuthOpen(true)}>
                🔐 Sign In / Register
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {/* TOP HEADER */}
        <header className="header">
          <div>
            <h1>Good Morning, {user?.name || "Saksham"} 👋</h1>
            <p>Track your academic goals, attendance eligibility, and study schedules.</p>
          </div>

          <div className="header-actions">
            {/* NOTIFICATION CENTER WITH BELL ICON & BADGE */}
            <NotificationCenter
              stats={stats}
              toasts={toasts}
              onDismissToast={dismissToast}
              onNavigate={(targetPage) => setPage(targetPage)}
            />

            <button
              className="report-export-btn"
              onClick={() => setIsReportOpen(true)}
              title="Generate Official Academic PDF Report"
            >
              📄 Export Academic Report (PDF)
            </button>

            <div className="profile-pill">
              👤 {user?.name || "Saksham"}
            </div>
          </div>
        </header>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <>
            {/* KEY STATS CARDS */}
            <section className="stats">
              <div className="card">
                <h3>📋 Tasks</h3>
                <h2>{stats.totalTasks}</h2>
                <p>{stats.pendingTasks} pending, {stats.completedTasks} done</p>
              </div>

              <div className="card">
                <h3>📅 Exams</h3>
                <h2>{stats.upcomingExamsCount}</h2>
                <p>Upcoming Exams</p>
              </div>

              <div className="card">
                <h3>📊 Attendance</h3>
                <h2>{stats.overallAttendance}%</h2>
                <p style={{ color: stats.overallAttendance >= 75 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                  {stats.overallAttendance >= 75 ? "✅ Eligible for Exams" : "⚠️ Shortage (<75%)"}
                </p>
              </div>

              <div className="card">
                <h3>🎯 Productivity</h3>
                <h2>{stats.productivity}%</h2>
                <p>Weekly Target Rate</p>
              </div>
            </section>

            {/* INTERACTIVE VISUAL ANALYTICS CHARTS */}
            <AnalyticsCharts
              attendanceData={stats.attendanceChart || []}
              priorityData={stats.priorityDistribution || { High: 0, Medium: 0, Low: 0 }}
              totalTasks={stats.totalTasks}
              completedTasks={stats.completedTasks}
            />

            {/* TODAY'S TASKS & UPCOMING EXAMS PANELS */}
            <section className="dashboard-grid">
              <div className="panel">
                <div className="panel-header">
                  <h2>Today's Priority Tasks</h2>
                  <button className="add-btn" onClick={() => setPage("tasks")}>
                    + Manage Tasks
                  </button>
                </div>

                {stats.tasks && stats.tasks.length > 0 ? (
                  stats.tasks.map((task) => (
                    <div
                      className={`task ${task.completed ? "completed" : ""}`}
                      key={task.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleToggleTask(task.id)}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(task.completed)}
                        onChange={() => {}}
                      />
                      <span
                        style={{
                          textDecoration: task.completed ? "line-through" : "none",
                          color: task.completed ? "var(--text-muted)" : "inherit"
                        }}
                      >
                        {task.title}
                      </span>
                      <small className={`priority-badge ${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </small>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--text-muted)", padding: "15px 0" }}>
                    No pending tasks for today! Great job staying ahead.
                  </p>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Upcoming Exam Timetable</h2>
                  <button className="add-btn" onClick={() => setPage("exams")}>
                    View All
                  </button>
                </div>

                {stats.exams && stats.exams.length > 0 ? (
                  stats.exams.map((exam) => (
                    <div className="exam" key={exam.id}>
                      <div>
                        <h3>{exam.subject}</h3>
                        <p>{exam.type}</p>
                      </div>
                      <strong>📅 {exam.date}</strong>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--text-muted)", padding: "15px 0" }}>
                    No upcoming exams scheduled.
                  </p>
                )}
              </div>
            </section>

            {/* AI STUDY ASSISTANT BANNER */}
            <section className="ai-box">
              <div>
                <h2>🤖 AI Academic Study Assistant</h2>
                <p>
                  Get intelligent study timetables and topic explanations tailored to your real exams and attendance metrics.
                </p>
              </div>

              <button onClick={() => setPage("ai")}>Ask AI Study Tutor</button>
            </section>
          </>
        )}

        {/* TASKS */}
        {page === "tasks" && <Tasks addToast={addToast} onUpdate={fetchStats} />}

        {/* NOTES */}
        {page === "notes" && <Notes addToast={addToast} onUpdate={fetchStats} />}

        {/* EXAMS */}
        {page === "exams" && <Exams addToast={addToast} onUpdate={fetchStats} />}

        {/* ATTENDANCE */}
        {page === "attendance" && <Attendance addToast={addToast} onUpdate={fetchStats} />}

        {/* AI ASSISTANT */}
        {page === "ai" && <AIAssistant addToast={addToast} />}
      </main>

      {/* AUTHENTICATION MODAL */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* REPORT MODAL */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}

export default App;
