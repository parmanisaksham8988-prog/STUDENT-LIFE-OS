# 🎓 Student Life OS

A full-stack academic productivity platform designed for students to track tasks, organize study notes with file attachments, manage exams & deadlines, monitor attendance eligibility, and get personalized study plans from an AI Study Assistant.

---

## 🏗️ Project Architecture

- **Frontend**: React 19 + Vite + CSS3
- **Backend**: Python 3.11 + Flask + Flask-CORS + Werkzeug + SQLite3
- **AI Assistant**: Context-aware academic advisor integrating live database tasks, exams, and attendance (with optional Google Gemini API support)
- **File Storage**: Local filesystem storage for notes attachments with secure download links

---

## 🚀 How to Run the Application

### 1. Start Backend (Flask API)

Open a terminal in the project root:

```bash
# Navigate to backend and activate virtual environment
cd backend
.\venv\Scripts\activate

# Install dependencies (already installed in venv)
pip install -r requirements.txt

# Run the Flask backend server
python app.py
```

The backend server will run on `http://127.0.0.1:5000`.

### 2. Start Frontend (React + Vite)

Open a second terminal in the project root:

```bash
# Navigate to frontend
cd frontend

# Start the Vite development server
npm run dev
```

The frontend will run on `http://localhost:5173`.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated dashboard stats, today's tasks & upcoming exams |
| `GET` | `/api/tasks` | Get all tasks |
| `POST` | `/api/tasks` | Create a new task (`title`, `subject`, `priority`) |
| `PATCH` | `/api/tasks/<id>/toggle` | Toggle task completion status |
| `DELETE` | `/api/tasks/<id>` | Delete a task |
| `GET` | `/api/notes` | Get all study notes and attachment metadata |
| `POST` | `/api/notes` | Create a note (supports multipart form file uploads) |
| `DELETE` | `/api/notes/<id>` | Delete a note and its attached file |
| `GET` | `/api/files/<filename>` | Download / view uploaded note attachment |
| `GET` | `/api/exams` | Get list of upcoming exams |
| `POST` | `/api/exams` | Create an exam (`subject`, `type`, `date`) |
| `DELETE` | `/api/exams/<id>` | Delete an exam |
| `GET` | `/api/attendance` | Get all subject attendance records and overall percentage |
| `POST` | `/api/attendance` | Add a subject attendance record |
| `PUT` | `/api/attendance/<id>` | Update attendance record |
| `PATCH` | `/api/attendance/<id>/mark` | Quick mark attendance (`present: true/false`) |
| `DELETE` | `/api/attendance/<id>` | Delete subject attendance record |
| `POST` | `/api/ai/chat` | AI Academic Assistant chat & study plan generator |

---

## ⚙️ Environment Variables (Optional)

In `backend/.env`:

```env
PORT=5000
FLASK_ENV=development
# Optional: Add your Google Gemini API key for external LLM reasoning
# GEMINI_API_KEY=your_gemini_api_key_here
```
