const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getUsername(): string | null {
  return localStorage.getItem('username');
}

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Auth
export const authApi = {
  login: (username: string, password: string, role: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),
  register: (username: string, password: string, role: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({
        username: getUsername(),
        currentPassword,
        newPassword,
      }),
    }),
};

// Students
export const studentApi = {
  getMyProfile: () =>
    apiRequest(`/students/me?username=${getUsername()}`),
  getAll: () =>
    apiRequest('/students'),
  getById: (id: number) =>
    apiRequest(`/students/${id}`),
  update: (id: number, data: any) =>
    apiRequest(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getUnlinkedUsers: () =>
    apiRequest('/students/unlinked-users'),
  createStudent: (data: any, username?: string) =>
    apiRequest(`/students${username ? `?username=${username}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Applications
export const applicationApi = {
  getMy: () =>
    apiRequest(`/applications/my?username=${getUsername()}`),
  getMyStats: () =>
    apiRequest(`/applications/my/stats?username=${getUsername()}`),
  getAll: () =>
    apiRequest('/applications'),
  create: (data: any) =>
    apiRequest('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    apiRequest(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest(`/applications/${id}`, { method: 'DELETE' }),
};

// Notifications
export const notificationApi = {
  getMy: () =>
    apiRequest(`/notifications/my?username=${getUsername()}`),
  getUnreadCount: () =>
    apiRequest(`/notifications/my/unread-count?username=${getUsername()}`),
  markAsRead: (id: number) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () =>
    apiRequest(`/notifications/my/read-all?username=${getUsername()}`, { method: 'PUT' }),
};

// Events
export const eventApi = {
  getAll: () =>
    apiRequest('/events'),
  getUpcoming: () =>
    apiRequest('/events/upcoming'),
  create: (data: any) =>
    apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    apiRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest(`/events/${id}`, { method: 'DELETE' }),
};

// Resources
export const resourceApi = {
  getAll: (category?: string) =>
    apiRequest(`/resources${category ? `?category=${category}` : ''}`),
  create: (data: any) =>
    apiRequest('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest(`/resources/${id}`, { method: 'DELETE' }),
};

// On-Duty Requests
export const onDutyApi = {
  create: (data: any) =>
    apiRequest(`/on-duty?username=${getUsername()}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMy: () =>
    apiRequest(`/on-duty/my?username=${getUsername()}`),
  getAll: () =>
    apiRequest('/on-duty/all'),
  updateStatus: (id: number, status: string) =>
    apiRequest(`/on-duty/${id}/status?status=${status}`, { method: 'PUT' }),
};

// Companies
export const companyApi = {
  getAll: () =>
    apiRequest('/companies'),
  getById: (id: number) =>
    apiRequest(`/companies/${id}`),
  create: (data: { name: string; industry: string; website: string }) =>
    apiRequest('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest(`/companies/${id}`, { method: 'DELETE' }),
};

// Auth helpers
export const auth = {
  isLoggedIn: () => !!getToken(),
  getUsername,
  getRole: () => localStorage.getItem('role'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  },
  saveLogin: (token: string, username: string, role: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
  },
};
