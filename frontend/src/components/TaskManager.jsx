import { useState, useEffect } from "react";
import { api } from "../api/api";

function TaskManager({ addToast, onUpdate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  async function addTask(e) {
    e.preventDefault();

    if (title.trim() === "" || subject.trim() === "") {
      alert("Please fill all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const newTask = await api.createTask({
        title: title.trim(),
        subject: subject.trim(),
        priority: priority
      });

      setTasks([newTask, ...tasks]);
      setTitle("");
      setSubject("");
      setPriority("Medium");
      if (addToast) {
        addToast(
          "Task Created 📝",
          `"${newTask.title}" added under ${newTask.subject} (${newTask.priority} priority).`,
          "success"
        );
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", err.message || "Failed to add task", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeTask(id) {
    try {
      const updated = await api.toggleTask(id);
      setTasks(tasks.map((task) => (task.id === id ? updated : task)));
      if (addToast) {
        addToast(
          updated.completed ? "Task Completed! 🎉" : "Task Reopened ↩",
          `"${updated.title}" marked as ${updated.completed ? "completed" : "pending"}.`,
          updated.completed ? "success" : "info"
        );
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", "Failed to update task status", "error");
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter((task) => task.id !== id));
      if (addToast) addToast("Task Removed 🗑", "Task has been deleted.", "info");
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", "Failed to delete task", "error");
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !task.completed) ||
      (statusFilter === "completed" && task.completed);

    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="task-manager">
      <div className="page-title-row">
        <div>
          <h2>Task Management</h2>
          <p>Organize assignments, coursework, and daily study targets.</p>
        </div>
      </div>

      {/* CREATE TASK FORM */}
      <form onSubmit={addTask} className="task-form">
        <input
          type="text"
          placeholder="Task title (e.g. Complete DBMS Assignment 2)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Subject (e.g. DBMS, OS, Web Dev)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority (Urgent)</option>
        </select>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "+ Add Task"}
        </button>
      </form>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search tasks by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>

        <div className="filter-dropdowns">
          <div className="status-tabs">
            <button
              className={statusFilter === "all" ? "tab-active" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All ({tasks.length})
            </button>
            <button
              className={statusFilter === "active" ? "tab-active" : ""}
              onClick={() => setStatusFilter("active")}
            >
              Active ({tasks.filter(t => !t.completed).length})
            </button>
            <button
              className={statusFilter === "completed" ? "tab-active" : ""}
              onClick={() => setStatusFilter("completed")}
            >
              Done ({tasks.filter(t => t.completed).length})
            </button>
          </div>

          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* TASK LIST */}
      {loading ? (
        <p className="loading-state">Loading tasks from database...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <p>No tasks match your search or filter criteria.</p>
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => (
            <div
              className={`task-item ${task.completed ? "completed" : ""}`}
              key={task.id}
            >
              <div>
                <h3>{task.title}</h3>
                <p>
                  📚 {task.subject} • Priority:{" "}
                  <span className={`priority-pill ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </p>
              </div>

              <div className="task-actions">
                <button
                  type="button"
                  onClick={() => completeTask(task.id)}
                  className={`status-btn ${task.completed ? "undo" : "done"}`}
                >
                  {task.completed ? "↩ Undo" : "✓ Complete"}
                </button>

                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => deleteTask(task.id)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskManager;
