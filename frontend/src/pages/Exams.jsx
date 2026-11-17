import { useState, useEffect } from "react";
import { api } from "../api/api";

function Exams({ addToast, onUpdate }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await api.getExams();
      setExams(data);
    } catch (err) {
      console.error("Error loading exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  async function addExam(e) {
    e.preventDefault();

    if (subject.trim() === "" || type.trim() === "" || date.trim() === "") {
      alert("Please fill all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const newExam = await api.createExam({
        subject: subject.trim(),
        type: type.trim(),
        date: date.trim()
      });

      setExams([...exams, newExam]);
      setSubject("");
      setType("");
      setDate("");

      if (addToast) {
        addToast(
          "Exam Scheduled 📅",
          `${newExam.subject} (${newExam.type}) set for ${newExam.date}. Reminder added!`,
          "warning"
        );
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", err.message || "Failed to add exam", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteExam(id) {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await api.deleteExam(id);
      setExams(exams.filter((exam) => exam.id !== id));
      if (addToast) addToast("Exam Removed 📅", "Exam timetable updated.", "info");
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", "Failed to delete exam", "error");
    }
  }

  return (
    <div className="exams-page">
      <div className="page-title-row">
        <div>
          <h1>My Scheduled Exams</h1>
          <p>Keep track of upcoming midterms, finals, and assignment submission deadlines.</p>
        </div>
      </div>

      <form className="exam-form" onSubmit={addExam}>
        <input
          type="text"
          placeholder="Subject (e.g. Database Management System)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Exam type (e.g. Midterm, Final, Unit Test 1)"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <button type="submit" className="primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Scheduling..." : "+ Add Exam"}
        </button>
      </form>

      {loading ? (
        <p className="loading-state">Loading exams from database...</p>
      ) : exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams currently scheduled. Add one above to set automatic countdown reminders!</p>
        </div>
      ) : (
        <div className="exam-list">
          {exams.map((exam) => (
            <div className="exam-card" key={exam.id}>
              <div>
                <h2>📚 {exam.subject}</h2>
                <p>{exam.type}</p>
                <strong>📅 Scheduled Date: {exam.date}</strong>
              </div>

              <button
                type="button"
                className="delete-btn"
                onClick={() => deleteExam(exam.id)}
              >
                🗑 Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Exams;
