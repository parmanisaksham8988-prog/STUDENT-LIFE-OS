export const getBaseApiUrl = () => {
  // 1. User-configured custom API URL from localStorage (useful for Vercel + Render pairing)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('student_os_custom_api_url');
    if (saved && saved.trim()) {
      const clean = saved.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  }

  // 2. Environment variable if provided during build (e.g. Vercel dashboard)
  if (import.meta.env.VITE_API_URL) {
    const envUrl = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    if (envUrl) {
      return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
    }
  }

  // 3. Browser environment fallback
  if (typeof window !== 'undefined') {
    // If running under Vite dev server (port 5173, 5174, or 3000)
    if (window.location.port && (window.location.port.startsWith('517') || window.location.port === '3000')) {
      return `http://${window.location.hostname}:5000/api`;
    }
    // Unified deployment (Flask serving frontend) or same-domain API
    return `${window.location.origin}/api`;
  }

  return '/api';
};

export const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('student_os_token') : null;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const request = async (endpoint, options = {}) => {
  const base = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    console.error(`Network error requesting ${url}:`, err);
    throw new Error(`Cannot connect to server at ${base}. Please ensure the backend is running (python app.py) or set your backend URL in settings.`);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed with status ${res.status}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
};

export const api = {
  // Base file URL helper
  getFileUrl: (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = getBaseApiUrl().replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  },

  // Check backend server health
  checkHealth: async () => {
    try {
      const base = getBaseApiUrl();
      const res = await fetch(`${base}/dashboard/stats`, {
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Authentication
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      localStorage.setItem('student_os_token', data.token);
      localStorage.setItem('student_os_user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (name, email, password) => {
    const data = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (data.token) {
      localStorage.setItem('student_os_token', data.token);
      localStorage.setItem('student_os_user', JSON.stringify(data.user));
    }
    return data;
  },

  getMe: async () => {
    return request('/auth/me');
  },

  logout: () => {
    localStorage.removeItem('student_os_token');
    localStorage.removeItem('student_os_user');
  },

  getCurrentUser: () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('student_os_user') : null;
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // Dashboard
  getDashboardStats: async () => {
    return request('/dashboard/stats');
  },

  // Tasks
  getTasks: async () => {
    return request('/tasks');
  },

  createTask: async (taskData) => {
    return request('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  },

  toggleTask: async (id) => {
    return request(`/tasks/${id}/toggle`, {
      method: 'PATCH'
    });
  },

  deleteTask: async (id) => {
    return request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  // Notes
  getNotes: async () => {
    return request('/notes');
  },

  createNote: async (formDataOrObj) => {
    if (formDataOrObj instanceof FormData) {
      return request('/notes', {
        method: 'POST',
        body: formDataOrObj
      });
    } else {
      return request('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataOrObj)
      });
    }
  },

  deleteNote: async (id) => {
    return request(`/notes/${id}`, {
      method: 'DELETE'
    });
  },

  // Exams
  getExams: async () => {
    return request('/exams');
  },

  createExam: async (examData) => {
    return request('/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
  },

  deleteExam: async (id) => {
    return request(`/exams/${id}`, {
      method: 'DELETE'
    });
  },

  // Attendance
  getAttendance: async () => {
    return request('/attendance');
  },

  createAttendance: async (data) => {
    return request('/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  updateAttendance: async (id, data) => {
    return request(`/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  markAttendance: async (id, present = true) => {
    return request(`/attendance/${id}/mark`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ present })
    });
  },

  deleteAttendance: async (id) => {
    return request(`/attendance/${id}`, {
      method: 'DELETE'
    });
  },

  // Academic Report
  getAcademicReport: async () => {
    return request('/reports/summary');
  },

  // AI Assistant
  sendAIChat: async (message, apiKey = '') => {
    const keyToSend = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') || '';
    return request('/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, apiKey: keyToSend })
    });
  },

  saveAIKey: async (apiKey) => {
    const data = await request('/ai/save-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', apiKey);
    }
    return data;
  },

  setCustomApiUrl: (url) => {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('student_os_custom_api_url', url.trim().replace(/\/+$/, ''));
      } else {
        localStorage.removeItem('student_os_custom_api_url');
      }
    }
  },

  getCustomApiUrl: () => {
    return typeof window !== 'undefined' ? (localStorage.getItem('student_os_custom_api_url') || '') : '';
  }
};
