import { useState, useEffect } from "react";
import { api } from "../api/api";

function Notes({ addToast, onUpdate }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      console.error("Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  async function addNote(e) {
    e.preventDefault();

    if (title.trim() === "" || subject.trim() === "" || content.trim() === "") {
      alert("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("subject", subject.trim());
      formData.append("content", content.trim());
      if (file) {
        formData.append("file", file);
      }

      const newNote = await api.createNote(formData);
      setNotes([newNote, ...notes]);

      setTitle("");
      setSubject("");
      setContent("");
      setFile(null);

      const fileInput = document.getElementById("fileInput");
      if (fileInput) fileInput.value = "";

      if (addToast) {
        addToast(
          "Study Note Saved 📚",
          `"${newNote.title}" saved under ${newNote.subject}${newNote.file ? " with attachment." : "."}`,
          "success"
        );
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", err.message || "Failed to create note", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteNote(id) {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await api.deleteNote(id);
      setNotes(notes.filter((note) => note.id !== id));
      if (addToast) addToast("Note Deleted 🗑", "Study note removed.", "info");
      if (onUpdate) onUpdate();
    } catch (err) {
      if (addToast) addToast("Error", "Failed to delete note", "error");
    }
  }

  // Extract unique subjects for dropdown
  const uniqueSubjects = Array.from(new Set(notes.map((n) => n.subject).filter(Boolean)));

  // Filter notes based on search query and subject
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.subject.toLowerCase().includes(query);

    const matchesSubject =
      selectedSubject === "all" || note.subject === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  return (
    <div className="notes-page">
      <div className="page-title-row">
        <div>
          <h1>My Study Notes & Files</h1>
          <p>Store, search, and organize lecture notes, cheatsheets, and attachments.</p>
        </div>
      </div>

      {/* ADD NOTE FORM */}
      <form className="note-form" onSubmit={addNote}>
        <div className="form-row">
          <input
            type="text"
            placeholder="Note title (e.g. DBMS Normalization Rules)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Subject (e.g. DBMS, OS, AI, Networks)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <textarea
          placeholder="Write your detailed revision notes, code snippets, or key concepts here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />

        <div className="file-upload-box">
          <label htmlFor="fileInput" className="file-label">
            📎 Attach Reference File (PDF, DOCX, Images, TXT)
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />

          {file && (
            <span className="file-attached-info">
              📄 Attached: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        <button type="submit" className="primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Saving Note..." : "+ Add Study Note"}
        </button>
      </form>

      {/* SEARCH AND FILTER BAR */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search notes by keyword or concept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>

        <select
          className="filter-select"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="all">All Subjects ({notes.length})</option>
          {uniqueSubjects.map((subj, i) => (
            <option key={i} value={subj}>
              {subj}
            </option>
          ))}
        </select>
      </div>

      {/* NOTES LIST */}
      {loading ? (
        <p className="loading-state">Loading notes from database...</p>
      ) : filteredNotes.length === 0 ? (
        <div className="empty-state">
          <p>No study notes found matching your search.</p>
        </div>
      ) : (
        <div className="notes-list">
          {filteredNotes.map((note) => (
            <div className="note-card" key={note.id}>
              <div className="note-header">
                <h2>📝 {note.title}</h2>
                <span className="note-subject">📚 {note.subject}</span>
              </div>

              <p className="note-content">{note.content}</p>

              {/* ATTACHED FILE DOWNLOAD LINK */}
              {note.file && (
                <div className="note-file-bar">
                  <span>📎 {note.file.name}</span>
                  {note.file.url && (
                    <a
                      href={api.getFileUrl(note.file.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-link"
                    >
                      ⬇️ Download / Open File
                    </a>
                  )}
                </div>
              )}

              <div className="note-footer">
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => deleteNote(note.id)}
                >
                  🗑 Delete Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notes;
