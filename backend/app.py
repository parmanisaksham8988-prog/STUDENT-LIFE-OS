import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Also ensure parent dir is in sys.path
PARENT_DIR = os.path.dirname(BASE_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

import json
import sqlite3
import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from dotenv import load_dotenv

try:
    from ai_engine import call_gemini_api, generate_deep_academic_response
except ImportError:
    try:
        from backend.ai_engine import call_gemini_api, generate_deep_academic_response
    except ImportError:
        call_gemini_api = None
        generate_deep_academic_response = None

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

load_dotenv()

FRONTEND_DIST = os.path.join(PARENT_DIR, "frontend", "dist")

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        res = app.make_default_options_response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return res

DB_PATH = os.path.join(BASE_DIR, "student_life.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'txt', 'zip'}
JWT_SECRET = os.getenv('JWT_SECRET', 'student_life_os_secret_key_2026_jwt_token')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            priority TEXT DEFAULT 'Medium',
            completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            file_name TEXT,
            file_path TEXT,
            file_type TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            subject TEXT NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            attended INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    tables = ['tasks', 'notes', 'exams', 'attendance']
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [row['name'] for row in cursor.fetchall()]
        if 'user_id' not in columns:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER DEFAULT 1")
            except Exception:
                pass

    conn.commit()

    cursor.execute('SELECT * FROM users WHERE email = ?', ('demo@student.edu',))
    demo_user = cursor.fetchone()
    now = datetime.datetime.now().isoformat()
    demo_id = 1
    if not demo_user:
        hashed = generate_password_hash('password123')
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        ''', ('Saksham', 'demo@student.edu', hashed, now))
        demo_id = cursor.lastrowid
        conn.commit()
    else:
        demo_id = demo_user['id']

    cursor.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', (demo_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.executemany('''
            INSERT INTO tasks (user_id, title, subject, priority, completed, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', [
            (demo_id, "Complete DBMS Assignment", "DBMS", "High", 0, now),
            (demo_id, "JavaScript Practice", "Web Tech", "Medium", 0, now),
            (demo_id, "OS Revision", "Operating System", "High", 0, now),
            (demo_id, "Prepare Project Documentation", "Software Engineering", "Low", 0, now)
        ])

    cursor.execute('SELECT COUNT(*) as count FROM notes WHERE user_id = ?', (demo_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.execute('''
            INSERT INTO notes (user_id, title, subject, content, file_name, file_path, file_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            demo_id,
            "DBMS Normalization",
            "DBMS",
            "1NF: Eliminate repeating groups, ensure atomic values.\n2NF: Meet 1NF and eliminate partial dependencies.\n3NF: Meet 2NF and eliminate transitive dependencies.\nBCNF: Strict 3NF where every determinant is a candidate key.",
            None, None, None, now
        ))

    cursor.execute('SELECT COUNT(*) as count FROM exams WHERE user_id = ?', (demo_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.executemany('''
            INSERT INTO exams (user_id, subject, type, date, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', [
            (demo_id, "DBMS", "Database Management System", "2026-08-15", now),
            (demo_id, "Operating System", "OS Internal Exam", "2026-08-20", now),
            (demo_id, "Software Engineering", "Unit Test", "2026-08-25", now)
        ])

    cursor.execute('SELECT COUNT(*) as count FROM attendance WHERE user_id = ?', (demo_id,))
    if cursor.fetchone()['count'] == 0:
        cursor.executemany('''
            INSERT INTO attendance (user_id, name, attended, total, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', [
            (demo_id, "DBMS", 18, 20, now),
            (demo_id, "Operating System", 15, 20, now),
            (demo_id, "Software Engineering", 16, 20, now)
        ])

    conn.commit()
    conn.close()

# Automatically initialize database on module load (critical for Gunicorn & production deployments)
init_db()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def get_current_user_id():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload.get('user_id', None)
        except Exception:
            return None
    return None


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "An account with this email already exists"}), 409

    now = datetime.datetime.now().isoformat()
    hashed = generate_password_hash(password)
    cursor.execute('''
        INSERT INTO users (name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
    ''', (name, email, hashed, now))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # NOTE: New registered users start with a clean blank slate (0 tasks, 0 notes, 0 exams, 0 attendance)
    # Only Demo student (demo@student.edu) has sample academic data.
    token = generate_token(user_id)
    return jsonify({
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email
        }
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user['id'])
    return jsonify({
        "token": token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email']
        }
    })


@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, email FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(dict(user))

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            "totalTasks": 0,
            "pendingTasks": 0,
            "completedTasks": 0,
            "upcomingExamsCount": 0,
            "overallAttendance": 0,
            "productivity": 0,
            "tasks": [],
            "exams": [],
            "attendanceChart": [],
            "priorityDistribution": {
                "High": 0,
                "Medium": 0,
                "Low": 0
            }
        })

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', (user_id,))
    total_tasks = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1', (user_id,))
    completed_tasks = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 0', (user_id,))
    pending_tasks = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM exams WHERE user_id = ?', (user_id,))
    total_exams = cursor.fetchone()['count']

    cursor.execute('SELECT SUM(attended) as attended, SUM(total) as total FROM attendance WHERE user_id = ?', (user_id,))
    att_row = cursor.fetchone()
    total_attended = att_row['attended'] or 0
    total_classes = att_row['total'] or 0
    overall_attendance = round((total_attended / total_classes * 100)) if total_classes > 0 else 0

    productivity = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    cursor.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, id DESC LIMIT 5', (user_id,))
    tasks = [dict(row) for row in cursor.fetchall()]

    cursor.execute('SELECT * FROM exams WHERE user_id = ? ORDER BY date ASC LIMIT 5', (user_id,))
    exams = [dict(row) for row in cursor.fetchall()]

    cursor.execute('SELECT name, attended, total FROM attendance WHERE user_id = ? ORDER BY id ASC', (user_id,))
    att_chart_data = []
    for row in cursor.fetchall():
        pct = round((row['attended'] / row['total'] * 100)) if row['total'] > 0 else 0
        att_chart_data.append({
            "subject": row['name'],
            "attended": row['attended'],
            "total": row['total'],
            "percentage": pct,
            "status": "Safe" if pct >= 75 else "Warning"
        })

    cursor.execute('SELECT priority, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY priority', (user_id,))
    priority_dist = {row['priority']: row['count'] for row in cursor.fetchall()}

    conn.close()

    return jsonify({
        "totalTasks": total_tasks,
        "pendingTasks": pending_tasks,
        "completedTasks": completed_tasks,
        "upcomingExamsCount": total_exams,
        "overallAttendance": overall_attendance,
        "productivity": productivity,
        "tasks": tasks,
        "exams": exams,
        "attendanceChart": att_chart_data,
        "priorityDistribution": {
            "High": priority_dist.get("High", 0),
            "Medium": priority_dist.get("Medium", 0),
            "Low": priority_dist.get("Low", 0)
        }
    })


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify([])
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, id DESC', (user_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route('/api/tasks', methods=['POST'])
def add_task():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Please sign in or register to add tasks"}), 401
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    subject = data.get('subject', '').strip()
    priority = data.get('priority', 'Medium')

    if not title or not subject:
        return jsonify({"error": "Title and Subject are required"}), 400

    now = datetime.datetime.now().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (user_id, title, subject, priority, completed, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
    ''', (user_id, title, subject, priority, now))
    task_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    new_task = dict(cursor.fetchone())
    conn.close()

    return jsonify(new_task), 201


@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    task = cursor.fetchone()
    if not task:
        conn.close()
        return jsonify({"error": "Task not found"}), 404

    new_status = 0 if task['completed'] else 1
    cursor.execute('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', (new_status, task_id, user_id))
    conn.commit()

    cursor.execute('SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    updated_task = dict(cursor.fetchone())
    conn.close()

    return jsonify(updated_task)


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Task deleted successfully"})


@app.route('/api/notes', methods=['GET'])
def get_notes():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify([])
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC', (user_id,))
    notes = []
    for row in cursor.fetchall():
        note_dict = dict(row)
        file_obj = None
        if note_dict.get('file_name'):
            file_obj = {
                "name": note_dict['file_name'],
                "type": note_dict['file_type'],
                "url": f"/api/files/{note_dict['file_path']}"
            }
        note_dict['file'] = file_obj
        notes.append(note_dict)
    conn.close()
    return jsonify(notes)


@app.route('/api/notes', methods=['POST'])
def add_note():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Please sign in or register to add notes"}), 401
    title = request.form.get('title') or (request.json and request.json.get('title'))
    subject = request.form.get('subject') or (request.json and request.json.get('subject'))
    content = request.form.get('content') or (request.json and request.json.get('content'))

    if not title or not subject or not content:
        return jsonify({"error": "Title, subject and content are required"}), 400

    file_name = None
    file_path = None
    file_type = None

    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename != '' and allowed_file(file.filename):
            orig_name = secure_filename(file.filename)
            unique_filename = f"{int(datetime.datetime.now().timestamp())}_{orig_name}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(save_path)
            file_name = orig_name
            file_path = unique_filename
            file_type = file.content_type

    now = datetime.datetime.now().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO notes (user_id, title, subject, content, file_name, file_path, file_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, title, subject, content, file_name, file_path, file_type, now))
    note_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM notes WHERE id = ? AND user_id = ?', (note_id, user_id))
    new_note = dict(cursor.fetchone())
    conn.close()

    new_note['file'] = {
        "name": file_name,
        "type": file_type,
        "url": f"/api/files/{file_path}"
    } if file_name else None

    return jsonify(new_note), 201


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notes WHERE id = ? AND user_id = ?', (note_id, user_id))
    note = cursor.fetchone()
    if note and note['file_path']:
        try:
            file_full_path = os.path.join(app.config['UPLOAD_FOLDER'], note['file_path'])
            if os.path.exists(file_full_path):
                os.remove(file_full_path)
        except Exception as e:
            print(f"Error removing file: {e}")

    cursor.execute('DELETE FROM notes WHERE id = ? AND user_id = ?', (note_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Note deleted successfully"})


@app.route('/api/files/<filename>', methods=['GET'])
def get_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=False)


@app.route('/api/exams', methods=['GET'])
def get_exams():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify([])
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM exams WHERE user_id = ? ORDER BY date ASC', (user_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(rows)


@app.route('/api/exams', methods=['POST'])
def add_exam():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Please sign in or register to schedule exams"}), 401
    data = request.get_json() or {}
    subject = data.get('subject', '').strip()
    exam_type = data.get('type', '').strip()
    date = data.get('date', '').strip()

    if not subject or not exam_type or not date:
        return jsonify({"error": "Subject, exam type, and date are required"}), 400

    now = datetime.datetime.now().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO exams (user_id, subject, type, date, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, subject, exam_type, date, now))
    exam_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM exams WHERE id = ? AND user_id = ?', (exam_id, user_id))
    new_exam = dict(cursor.fetchone())
    conn.close()

    return jsonify(new_exam), 201


@app.route('/api/exams/<int:exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM exams WHERE id = ? AND user_id = ?', (exam_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Exam deleted successfully"})


@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            "subjects": [],
            "totalAttended": 0,
            "totalClasses": 0,
            "overallPercentage": 0
        })
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM attendance WHERE user_id = ? ORDER BY id ASC', (user_id,))
    subjects = [dict(row) for row in cursor.fetchall()]

    total_attended = sum(s['attended'] for s in subjects)
    total_classes = sum(s['total'] for s in subjects)
    overall_percentage = round((total_attended / total_classes * 100)) if total_classes > 0 else 0

    conn.close()
    return jsonify({
        "subjects": subjects,
        "totalAttended": total_attended,
        "totalClasses": total_classes,
        "overallPercentage": overall_percentage
    })


@app.route('/api/attendance', methods=['POST'])
def add_attendance():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Please sign in or register to log attendance"}), 401
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    attended = int(data.get('attended', 0))
    total = int(data.get('total', 0))

    if not name or total <= 0 or attended < 0:
        return jsonify({"error": "Valid name and class count are required"}), 400

    now = datetime.datetime.now().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO attendance (user_id, name, attended, total, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, name, attended, total, now))
    att_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT * FROM attendance WHERE id = ? AND user_id = ?', (att_id, user_id))
    new_att = dict(cursor.fetchone())
    conn.close()

    return jsonify(new_att), 201


@app.route('/api/attendance/<int:att_id>', methods=['PUT'])
def update_attendance(att_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    name = data.get('name')
    attended = data.get('attended')
    total = data.get('total')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM attendance WHERE id = ? AND user_id = ?', (att_id, user_id))
    att = cursor.fetchone()
    if not att:
        conn.close()
        return jsonify({"error": "Attendance record not found"}), 404

    new_name = name if name is not None else att['name']
    new_attended = int(attended) if attended is not None else att['attended']
    new_total = int(total) if total is not None else att['total']

    cursor.execute('''
        UPDATE attendance SET name = ?, attended = ?, total = ?
        WHERE id = ? AND user_id = ?
    ''', (new_name, new_attended, new_total, att_id, user_id))
    conn.commit()

    cursor.execute('SELECT * FROM attendance WHERE id = ? AND user_id = ?', (att_id, user_id))
    updated_att = dict(cursor.fetchone())
    conn.close()

    return jsonify(updated_att)


@app.route('/api/attendance/<int:att_id>/mark', methods=['PATCH'])
def mark_attendance(att_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    present = data.get('present', True)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM attendance WHERE id = ? AND user_id = ?', (att_id, user_id))
    att = cursor.fetchone()
    if not att:
        conn.close()
        return jsonify({"error": "Attendance record not found"}), 404

    new_total = att['total'] + 1
    new_attended = att['attended'] + (1 if present else 0)

    cursor.execute('''
        UPDATE attendance SET attended = ?, total = ? WHERE id = ? AND user_id = ?
    ''', (new_attended, new_total, att_id, user_id))
    conn.commit()

    cursor.execute('SELECT * FROM attendance WHERE id = ? AND user_id = ?', (att_id, user_id))
    updated_att = dict(cursor.fetchone())
    conn.close()

    return jsonify(updated_att)


@app.route('/api/attendance/<int:att_id>', methods=['DELETE'])
def delete_attendance(att_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM attendance WHERE id = ? AND user_id = ?', (att_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Attendance record deleted"})

@app.route('/api/reports/summary', methods=['GET'])
def get_academic_report():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"error": "Please sign in to view academic report"}), 401
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT id, name, email, created_at FROM users WHERE id = ?', (user_id,))
    user_row = cursor.fetchone()
    user = dict(user_row) if user_row else {"name": "Student", "email": "student@college.edu"}

    cursor.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, priority ASC', (user_id,))
    tasks = [dict(r) for r in cursor.fetchall()]

    cursor.execute('SELECT * FROM exams WHERE user_id = ? ORDER BY date ASC', (user_id,))
    exams = [dict(r) for r in cursor.fetchall()]

    cursor.execute('SELECT * FROM attendance WHERE user_id = ? ORDER BY id ASC', (user_id,))
    attendance = []
    for r in cursor.fetchall():
        pct = round((r['attended'] / r['total'] * 100)) if r['total'] > 0 else 0
        attendance.append({
            "name": r['name'],
            "attended": r['attended'],
            "total": r['total'],
            "percentage": pct,
            "status": "Eligible" if pct >= 75 else "Shortage Warning"
        })

    cursor.execute('SELECT COUNT(*) as count FROM notes WHERE user_id = ?', (user_id,))
    notes_count = cursor.fetchone()['count']

    total_att = sum(a['attended'] for a in attendance)
    total_cls = sum(a['total'] for a in attendance)
    overall_att = round((total_att / total_cls * 100)) if total_cls > 0 else 0

    conn.close()

    return jsonify({
        "generatedAt": datetime.datetime.now().strftime("%B %d, %Y - %I:%M %p"),
        "student": user,
        "academicSummary": {
            "overallAttendance": overall_att,
            "attendanceStatus": "Good Standing (Eligible)" if overall_att >= 75 else "Attendance Shortage (<75%)",
            "totalTasks": len(tasks),
            "completedTasks": sum(1 for t in tasks if t['completed']),
            "pendingTasks": sum(1 for t in tasks if not t['completed']),
            "upcomingExamsCount": len(exams),
            "notesCount": notes_count
        },
        "attendance": attendance,
        "exams": exams,
        "tasks": tasks
    })


def get_student_academic_context(user_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT title, subject, priority FROM tasks WHERE user_id = ? AND completed = 0', (user_id,))
    pending_tasks = [dict(r) for r in cursor.fetchall()]

    cursor.execute('SELECT subject, type, date FROM exams WHERE user_id = ? ORDER BY date ASC', (user_id,))
    exams = [dict(r) for r in cursor.fetchall()]

    cursor.execute('SELECT name, attended, total FROM attendance WHERE user_id = ?', (user_id,))
    att_records = []
    for r in cursor.fetchall():
        pct = round((r['attended'] / r['total'] * 100)) if r['total'] > 0 else 0
        att_records.append({
            "name": r['name'],
            "attended": r['attended'],
            "total": r['total'],
            "percentage": pct
        })

    cursor.execute('SELECT title, subject, content FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 5', (user_id,))
    notes_records = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "pendingTasks": pending_tasks,
        "exams": exams,
        "attendance": att_records,
        "notes": notes_records
    }


def generate_local_academic_response(prompt, context):
    p_lower = prompt.lower()
    tasks = context.get('pendingTasks', [])
    exams = context.get('exams', [])
    attendance = context.get('attendance', [])

    if "study plan" in p_lower or "schedule" in p_lower or "routine" in p_lower:
        exam_text = f"Preparing for upcoming exam: {exams[0]['subject']} ({exams[0]['type']})" if exams else "General review"
        task_text = f"Priority task: {tasks[0]['title']} ({tasks[0]['subject']})" if tasks else "Review recent lecture notes"
        return (
            f"Here is your customized High-Productivity Study Plan for today:\n\n"
            f"🎯 **Morning Session (9:00 AM - 11:30 AM)**: Deep Focus\n"
            f"- {task_text}\n"
            f"- Active recall & practice questions.\n\n"
            f"⚡ **Afternoon Session (2:00 PM - 4:30 PM)**: Exam Preparation\n"
            f"- {exam_text}\n"
            f"- Summarize key formulas and concepts.\n\n"
            f"🌙 **Evening Session (7:00 PM - 8:30 PM)**: Review & Organization\n"
            f"- Review attendance tracking & organize next day's task list.\n"
            f"- 25-minute Pomodoro recap."
        )

    if "what should i study" in p_lower or "recommend" in p_lower or "priority" in p_lower:
        high_prio_tasks = [t for t in tasks if t['priority'] == 'High']
        urgent_exam = exams[0] if exams else None

        response = "Here are your highest-priority study targets for today:\n\n"
        if urgent_exam:
            response += f"1. 🚨 **Nearest Exam Alert**: **{urgent_exam['subject']}** ({urgent_exam['type']}) on **{urgent_exam['date']}**. Dedicate at least 90 minutes to high-yield topics.\n"
        if high_prio_tasks:
            response += f"2. 📝 **Urgent Task**: Complete **'{high_prio_tasks[0]['title']}'** for {high_prio_tasks[0]['subject']}.\n"
        elif tasks:
            response += f"2. 📝 **Next Task**: Work on **'{tasks[0]['title']}'** ({tasks[0]['subject']}).\n"

        low_att = [a for a in attendance if a['percentage'] < 75]
        if low_att:
            response += f"3. ⚠️ **Attendance Alert**: Your attendance in **{low_att[0]['name']}** is at **{low_att[0]['percentage']}%** (<75%). Be sure to attend all upcoming classes!\n"

        return response

    if "normalization" in p_lower or "dbms" in p_lower:
        return (
            "📚 **DBMS Normalization Summary**:\n\n"
            "Normalization reduces data redundancy and improves data integrity.\n\n"
            "1. **1NF (First Normal Form)**: Each table cell contains a single (atomic) value; no repeating groups.\n"
            "2. **2NF (Second Normal Form)**: Must be in 1NF + No partial dependencies (every non-prime attribute fully depends on the entire primary key).\n"
            "3. **3NF (Third Normal Form)**: Must be in 2NF + No transitive dependencies (non-key attributes must not depend on other non-key attributes).\n"
            "4. **BCNF (Boyce-Codd Normal Form)**: Strict 3NF where for every functional dependency X -> Y, X must be a super key.\n\n"
            "💡 *Pro-Tip*: In exams, always show step-by-step decomposition with candidate keys identified!"
        )

    if "operating system" in p_lower or "deadlock" in p_lower or "paging" in p_lower or "process" in p_lower:
        return (
            "💻 **Operating Systems Key Concepts**:\n\n"
            "• **4 Conditions for Deadlock (Coffman Conditions)**:\n"
            "  1. Mutual Exclusion\n"
            "  2. Hold and Wait\n"
            "  3. No Preemption\n"
            "  4. Circular Wait\n\n"
            "• **Paging vs Segmentation**:\n"
            "  - Paging divides memory into fixed-size physical frames and logical pages (eliminates external fragmentation).\n"
            "  - Segmentation divides memory based on logical modules with variable sizes.\n\n"
            "• **CPU Scheduling Algorithms**: FCFS, SJF (Shortest Job First), Round Robin (time quantum), Priority Scheduling."
        )

    if "attendance" in p_lower:
        low_att = [a for a in attendance if a['percentage'] < 75]
        if low_att:
            return (
                f"⚠️ **Attendance Warning**: You have subjects below the 75% threshold!\n" +
                "\n".join([f"- **{a['name']}**: {a['attended']}/{a['total']} classes ({a['percentage']}%)" for a in low_att]) +
                "\n\n👉 *Recommendation*: Attend the next 3-4 consecutive lectures to restore your eligibility safely above 75%."
            )
        else:
            return "✅ Great job! Your attendance is currently healthy and on track across all enrolled subjects. Keep maintaining this consistency!"

    urgent_info = f"You have {len(tasks)} pending tasks and {len(exams)} upcoming exams."
    return (
        f"Hello! I am your Student Life Academic Assistant. 🎓\n\n"
        f"📊 **Current Status**: {urgent_info}\n\n"
        f"I can help you with:\n"
        f"• Breaking down complex topics (DBMS, OS, Data Structures, Web Dev, etc.)\n"
        f"• Creating custom daily study timetables based on your deadlines\n"
        f"• Tracking exam preparation and prioritizing high-yield assignments\n\n"
        f"Feel free to ask me anything or click one of the quick question prompts below!"
    )


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    custom_key = data.get('apiKey', '').strip()
    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    academic_context = get_student_academic_context(user_id)

    # If user provided API key or backend has GEMINI_API_KEY set
    api_key = custom_key or os.getenv('GEMINI_API_KEY')
    if api_key:
        prompt_context = (
            f"You are the Student Life OS AI Academic Assistant & Study Tutor. Help the college student with comprehensive guidance, coding solutions, concept explanations, and study scheduling.\n\n"
            f"Current Student Academic Records:\n"
            f"- Pending Tasks: {json.dumps(academic_context['pendingTasks'])}\n"
            f"- Scheduled Exams: {json.dumps(academic_context['exams'])}\n"
            f"- Attendance Status: {json.dumps(academic_context['attendance'])}\n"
            f"- Saved Notes: {json.dumps(academic_context['notes'])}\n\n"
            f"Student Question: {message}\n\n"
            f"Instructions: Provide a structured, engaging, and directly helpful response. Use Markdown headings (###), bullet points, and syntax-highlighted code blocks where applicable."
        )
        reply, source = call_gemini_api(prompt_context, api_key)
        if reply:
            return jsonify({"reply": reply, "source": source})

    # Deep intelligent academic engine fallback
    ai_reply = generate_deep_academic_response(message, academic_context)
    return jsonify({"reply": ai_reply, "source": "deep_academic_engine"})


@app.route('/api/ai/save-key', methods=['POST'])
def save_ai_key():
    data = request.get_json() or {}
    key = data.get('apiKey', '').strip()
    if not key:
        return jsonify({"error": "API Key is required"}), 400

    # Test key validity
    test_reply, source = call_gemini_api("Hello! Respond with 'Connected successfully.' in 3 words.", key)
    if not test_reply:
        return jsonify({"error": "Invalid API Key or connection failed. Please verify your Google AI Studio key."}), 400

    os.environ['GEMINI_API_KEY'] = key
    return jsonify({"success": True, "message": "Google Gemini API key connected successfully!", "source": source})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({
        "message": "Student Life OS Backend API is running.",
        "hint": "Frontend build not found. Run 'npm run build' in the frontend folder."
    })


# Initialize database
init_db()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Student Life OS Backend running on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
