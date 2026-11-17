import { useState, useEffect } from "react";
import { api } from "../api/api";
import ReportModal from "../components/ReportModal";

function Attendance({ addToast, onUpdate }) {
  const [subjects, setSubjects] = useState([]);
  const [totalAttended, setTotalAttended] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [name, setName] = useState("");
  const [attended, setAttended] = useState("");
  const [total, setTotal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await api.getAttendance();
      setSubjects(data.subjects || []);
      setTotalAttended(data.totalAttended || 0);
      setTotalClasses(data.totalClasses || 0);
      setOverallPercentage(data.overallPercentage || 0);
    } catch (err) {
      console.error("Error loading attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  async function addSubject(e) {
    e.preventDefault();

    if (name.trim() === "" || attended === "" || total === "") {
      alert("Please fill all fields");
      return;
    }

    const attNum = parseInt(attended, 10);
    const totNum = parseInt(total, 10);

    if (isNaN(attNum) || isNaN(totNum) || totNum <= 0 || attNum < 0 || attNum > totNum) {
      alert("Please enter valid class counts (Attended cannot exceed Total)");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createAttendance({
        name: name.trim(),
        attended: attNum,
        total: totNum
      });

      setName("");
      setAttended("");
      setTotal("");
      fetchAttendance();

      if (addToast) {
        addToast(
          "Subject Logged 📊",
          `Now tracking attendance for ${name.trim()} (${attNum}/${totNum} classes).`,
          "success"
        );
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", err.message || "Failed to add subject", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMark(subjectObj, present) {
    try {
      const updated = await api.markAttendance(subjectObj.id, present);
      fetchAttendance();

      const newPct = Math.round((updated.attended / updated.total) * 100);
      if (addToast) {
        if (present) {
          addToast(
            "Marked Present! ✅",
            `${subjectObj.name}: ${updated.attended}/${updated.total} attended (${newPct}%).`,
            "success"
          );
        } else {
          addToast(
            "Marked Absent ⚠️",
            `${subjectObj.name}: ${updated.attended}/${updated.total} attended (${newPct}%). ${newPct < 75 ? "Warning: Shortage alert!" : ""}`,
            newPct < 75 ? "warning" : "info"
          );
        }
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", "Failed to update attendance count", "error");
    }
  }

  async function deleteSubject(id) {
    if (!window.confirm("Are you sure you want to delete this subject's attendance record?")) return;
    try {
      await api.deleteAttendance(id);
      fetchAttendance();
      if (addToast) addToast("Subject Removed 🗑", "Attendance tracking deleted.", "info");
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", "Failed to delete subject", "error");
    }
  }

  function getPercentage(att, tot) {
    if (!tot || tot === 0) return 0;
    return Math.round((att / tot) * 100);
  }

  return (
    <div className="attendance-page">
      <div className="page-title-row">
        <div>
          <h1>Attendance & Eligibility Tracker</h1>
          <p>Monitor your subject-by-subject attendance against the mandatory 75% college criteria.</p>
        </div>

        <button className="report-export-btn" onClick={() => setIsReportOpen(true)}>
          📄 Export Attendance Report (PDF)
        </button>
      </div>

      {/* OVERALL ATTENDANCE SUMMARY CARD */}
      <div className={`attendance-summary ${overallPercentage >= 75 ? "summary-safe" : "summary-warning"}`}>
        <div>
          <h2>{overallPercentage}%</h2>
          <p>
            Overall Aggregate: {totalAttended} / {totalClasses} total lectures attended
          </p>
        </div>
        <div className="summary-status-badge">
          {overallPercentage >= 75 ? "✅ Exam Eligible (Safe)" : "⚠️ Attendance Shortage (<75%)"}
        </div>
      </div>

      {/* ADD SUBJECT FORM */}
      <form className="attendance-form" onSubmit={addSubject}>
        <input
          type="text"
          placeholder="Subject name (e.g. Operating Systems)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Attended Classes"
          value={attended}
          onChange={(e) => setAttended(e.target.value)}
          min="0"
          required
        />

        <input
          type="number"
          placeholder="Total Classes Held"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          min="1"
          required
        />

        <button type="submit" className="primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "+ Add Subject"}
        </button>
      </form>

      {/* SUBJECTS LIST */}
      {loading ? (
        <p className="loading-state">Loading attendance data...</p>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <p>No subjects logged yet. Add your enrolled courses above!</p>
        </div>
      ) : (
        <div className="attendance-list">
          {subjects.map((subject) => {
            const percentage = getPercentage(subject.attended, subject.total);
            const isSafe = percentage >= 75;

            return (
              <div className="attendance-card" key={subject.id}>
                <div>
                  <div className="attendance-header">
                    <h2>📚 {subject.name}</h2>
                    <span className={`status-pill ${isSafe ? "pill-safe" : "pill-danger"}`}>
                      {isSafe ? "Eligible" : "Shortage Warning"}
                    </span>
                  </div>

                  <p className="attendance-details">
                    {subject.attended} / {subject.total} classes attended
                  </p>

                  <div className="attendance-quick-actions">
                    <button
                      type="button"
                      className="mark-btn present"
                      onClick={() => handleMark(subject, true)}
                    >
                      +1 Attended (Present)
                    </button>
                    <button
                      type="button"
                      className="mark-btn absent"
                      onClick={() => handleMark(subject, false)}
                    >
                      +1 Missed (Absent)
                    </button>
                  </div>
                </div>

                <div className="attendance-percent-col">
                  <strong className={`percentage-text ${isSafe ? "safe" : "danger"}`}>
                    {percentage}%
                  </strong>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteSubject(subject.id)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT MODAL */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}

export default Attendance;
