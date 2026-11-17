import React, { useState, useEffect } from "react";
import { api } from "../api/api";

function ReportModal({ isOpen, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await api.getAcademicReport();
      setReport(data);
    } catch (err) {
      console.error("Failed to load academic report:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card report-modal-card">
        <div className="modal-header no-print">
          <h2>📄 Official Academic Summary Report</h2>
          <div className="modal-actions-top">
            <button className="print-btn" onClick={handlePrint}>🖨️ Print / Save as PDF</button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Generating official academic audit report...</p>
        ) : report ? (
          <div className="printable-report" id="printable-area">
            <div className="report-header">
              <div>
                <h1>🎓 STUDENT ACADEMIC AUDIT & PROGRESS REPORT</h1>
                <p className="report-subtitle">Student Life OS Academic Verification Portal</p>
              </div>
              <div className="report-meta">
                <p><strong>Generated:</strong> {report.generatedAt}</p>
                <p><strong>Student:</strong> {report.student?.name || "Saksham"}</p>
                <p><strong>Email:</strong> {report.student?.email || "demo@student.edu"}</p>
              </div>
            </div>

            <hr className="report-divider" />

            {/* SUMMARY BADGES */}
            <div className="report-summary-grid">
              <div className="report-stat-card">
                <h4>Overall Attendance</h4>
                <h2>{report.academicSummary?.overallAttendance}%</h2>
                <span className={`status-tag ${report.academicSummary?.overallAttendance >= 75 ? "tag-safe" : "tag-danger"}`}>
                  {report.academicSummary?.attendanceStatus}
                </span>
              </div>

              <div className="report-stat-card">
                <h4>Pending Tasks</h4>
                <h2>{report.academicSummary?.pendingTasks}</h2>
                <span>Out of {report.academicSummary?.totalTasks} Total Tasks</span>
              </div>

              <div className="report-stat-card">
                <h4>Upcoming Exams</h4>
                <h2>{report.academicSummary?.upcomingExamsCount}</h2>
                <span>Scheduled This Term</span>
              </div>

              <div className="report-stat-card">
                <h4>Study Notes</h4>
                <h2>{report.academicSummary?.notesCount}</h2>
                <span>Saved Documents</span>
              </div>
            </div>

            {/* ATTENDANCE AUDIT TABLE */}
            <div className="report-section">
              <h3>1. Subject Attendance Eligibility Record</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Attended</th>
                    <th>Total</th>
                    <th>Percentage</th>
                    <th>Eligibility Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.attendance?.map((att, i) => (
                    <tr key={i}>
                      <td><strong>{att.name}</strong></td>
                      <td>{att.attended}</td>
                      <td>{att.total}</td>
                      <td><strong>{att.percentage}%</strong></td>
                      <td>
                        <span className={`pill ${att.percentage >= 75 ? "pill-safe" : "pill-danger"}`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* UPCOMING EXAMS SCHEDULE */}
            <div className="report-section">
              <h3>2. Scheduled Examination Timetable</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Assessment Type</th>
                  </tr>
                </thead>
                <tbody>
                  {report.exams?.length > 0 ? (
                    report.exams.map((ex, i) => (
                      <tr key={i}>
                        <td><strong>📅 {ex.date}</strong></td>
                        <td>{ex.subject}</td>
                        <td>{ex.type}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No exams currently scheduled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PENDING TASKS CHECKLIST */}
            <div className="report-section">
              <h3>3. Active Coursework & Tasks Checklist</h3>
              <ul className="report-task-list">
                {report.tasks?.map((task, i) => (
                  <li key={i} className={task.completed ? "task-done" : ""}>
                    <span>{task.completed ? "☑" : "☐"} <strong>{task.title}</strong> ({task.subject})</span>
                    <span className="task-priority-tag">Priority: {task.priority}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="report-footer">
              <p>Generated by Student Life OS Academic Suite. Verified for College 5th Semester Mini Project Presentation.</p>
            </div>
          </div>
        ) : (
          <p className="error-text">Failed to load report data.</p>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
