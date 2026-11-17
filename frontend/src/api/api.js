const getBaseApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // If running under local Vite dev server, route to local Flask backend
    if (window.location.port === '5173') {
      return 'http://localhost:5000/api';
    }
    // In production or cloud deployments, use current origin
    return `${window.location.origin}/api`;
  }
  return '/api';
};

const API_BASE_URL = getBaseApiUrl();

const getAuthHeaders = () => {
  const token = localStorage.getItem('student_os_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Base file URL helper
  getFileUrl: (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  },

  // Authentication
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('student_os_token', data.token);
      localStorage.setItem('student_os_user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (name, email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('student_os_token', data.token);
      localStorage.setItem('student_os_user', JSON.stringify(data.user));
    }
    return data;
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  logout: () => {
    localStorage.removeItem('student_os_token');
    localStorage.removeItem('student_os_user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('student_os_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // Dashboard
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Tasks
  getTasks: async () => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(taskData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create task');
    }
    return res.json();
  },

  toggleTask: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  deleteTask: async (id) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  // Notes
  getNotes: async () => {
    const res = await fetch(`${API_BASE_URL}/notes`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  createNote: async (formDataOrObj) => {
    let options = {
      method: 'POST',
      headers: getAuthHeaders()
    };
    if (formDataOrObj instanceof FormData) {
      options.body = formDataOrObj;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(formDataOrObj);
    }
    const res = await fetch(`${API_BASE_URL}/notes`, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create note');
    }
    return res.json();
  },

  deleteNote: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  // Exams
  getExams: async () => {
    const res = await fetch(`${API_BASE_URL}/exams`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch exams');
    return res.json();
  },

  createExam: async (examData) => {
    const res = await fetch(`${API_BASE_URL}/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(examData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create exam');
    }
    return res.json();
  },

  deleteExam: async (id) => {
    const res = await fetch(`${API_BASE_URL}/exams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete exam');
    return res.json();
  },

  // Attendance
  getAttendance: async () => {
    const res = await fetch(`${API_BASE_URL}/attendance`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch attendance');
    return res.json();
  },

  createAttendance: async (data) => {
    const res = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create attendance');
    }
    return res.json();
  },

  updateAttendance: async (id, data) => {
    const res = await fetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update attendance');
    return res.json();
  },

  markAttendance: async (id, present = true) => {
    const res = await fetch(`${API_BASE_URL}/attendance/${id}/mark`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ present })
    });
    if (!res.ok) throw new Error('Failed to mark attendance');
    return res.json();
  },

  deleteAttendance: async (id) => {
    const res = await fetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete attendance record');
    return res.json();
  },

  // Academic Report
  getAcademicReport: async () => {
    const res = await fetch(`${API_BASE_URL}/reports/summary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate academic report');
    return res.json();
  },

  // AI Assistant
  sendAIChat: async (message, apiKey = '') => {
    const keyToSend = apiKey || localStorage.getItem('gemini_api_key') || '';
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ message, apiKey: keyToSend })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to communicate with AI Assistant');
    }
    return res.json();
  },

  saveAIKey: async (apiKey) => {
    const res = await fetch(`${API_BASE_URL}/ai/save-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ apiKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to connect Google Gemini API key');
    }
    const data = await res.json();
    localStorage.setItem('gemini_api_key', apiKey);
    return data;
  }
};
