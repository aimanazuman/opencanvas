import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle maintenance mode (503)
    if (error.response?.status === 503 && error.response?.data?.error === 'maintenance_mode') {
      window.dispatchEvent(new CustomEvent('maintenance-mode', { detail: error.response.data }));
      return Promise.reject(error);
    }

    // Attempt token refresh on 401 (not for refresh/login endpoints)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/token/refresh') &&
      !originalRequest.url.includes('/accounts/login')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/token/refresh/`, { refresh: refreshToken });
          const { access } = res.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed — clear tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export const boardsApi = {
  getAll: (params) => api.get('/boards/', { params }),
  get: (id) => api.get(`/boards/${id}/`),
  create: (data) => api.post('/boards/', data),
  update: (id, data) => api.patch(`/boards/${id}/`, data),
  delete: (id) => api.delete(`/boards/${id}/`),
  toggleStar: (id) => api.post(`/boards/${id}/toggle_star/`),
  archive: (id) => api.post(`/boards/${id}/archive/`),
  restore: (id) => api.post(`/boards/${id}/restore/`),
  duplicate: (id) => api.post(`/boards/${id}/duplicate/`),
  getTemplates: () => api.get('/boards/templates/'),
  getStarred: () => api.get('/boards/starred/'),
  getArchived: () => api.get('/boards/archived/'),
  getVersions: (id) => api.get(`/boards/${id}/versions/`),
  restoreVersion: (id, versionId) => api.post(`/boards/${id}/restore_version/`, { version_id: versionId }),
  leave: (id) => api.post(`/boards/${id}/leave/`),
  submitQuizResponse: (id, response) => api.post(`/boards/${id}/submit-quiz-response/`, { response }),
  // Invite links
  createInvite: (id, data) => api.post(`/boards/${id}/create_invite/`, data),
  getInvites: (id) => api.get(`/boards/${id}/invites/`),
  revokeInvite: (id, data) => api.post(`/boards/${id}/revoke_invite/`, data),
};

export const sharesApi = {
  getAll: () => api.get('/boards/shares/'),
  create: (data) => api.post('/boards/shares/', data),
  update: (shareId, data) => api.patch(`/boards/shares/${shareId}/`, data),
  remove: (shareId) => api.delete(`/boards/shares/${shareId}/`),
};

export const inviteApi = {
  join: (token) => api.post(`/boards/join/${token}/`),
  getInfo: (token) => api.get(`/boards/join/${token}/`),
};

export const coursesApi = {
  getAll: (params) => api.get('/courses/courses/', { params }),
  get: (id) => api.get(`/courses/courses/${id}/`),
  create: (data) => api.post('/courses/courses/', data),
  update: (id, data) => api.patch(`/courses/courses/${id}/`, data),
  delete: (id) => api.delete(`/courses/courses/${id}/`),
  enroll: (id, data) => api.post(`/courses/courses/${id}/enroll/`, data),
  unenroll: (id) => api.post(`/courses/courses/${id}/unenroll/`),
  analytics: (id) => api.get(`/courses/courses/${id}/analytics/`),
  regenerateInvite: (id) => api.post(`/courses/courses/${id}/regenerate-invite/`),
  joinByCode: (data) => api.post('/courses/courses/join-by-code/', data),
  getInviteInfo: (code) => api.get(`/courses/courses/invite-info/${code}/`),
  bulkEnroll: (id, data) => api.post(`/courses/courses/${id}/bulk-enroll/`, data),
};

export const enrollmentsApi = {
  getAll: (params) => api.get('/courses/enrollments/', { params }),
  get: (id) => api.get(`/courses/enrollments/${id}/`),
  create: (data) => api.post('/courses/enrollments/', data),
  update: (id, data) => api.patch(`/courses/enrollments/${id}/`, data),
  delete: (id) => api.delete(`/courses/enrollments/${id}/`),
  getForCourse: (courseId) => api.get('/courses/enrollments/', { params: { course: courseId } }),
};

export const filesApi = {
  getAll: (params) => api.get('/files/', { params }),
  upload: (formData, onUploadProgress = null) => api.post('/files/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...(onUploadProgress && { onUploadProgress }),
  }),
  delete: (id) => api.delete(`/files/${id}/`),
  getUsage: () => api.get('/files/usage/'),
};

export const notificationsApi = {
  getAll: (params) => api.get('/accounts/notifications/', { params }),
  markRead: (id) => api.patch(`/accounts/notifications/${id}/read/`),
  markAllRead: () => api.post('/accounts/notifications/mark-all-read/'),
  getUnreadCount: () => api.get('/accounts/notifications/unread-count/'),
};

export const usersApi = {
  search: (query) => api.get(`/accounts/users/search/?q=${encodeURIComponent(query)}`),
  getAll: (params) => api.get('/accounts/users/', { params }),
  get: (id) => api.get(`/accounts/users/${id}/`),
  create: (data) => api.post('/accounts/users/create/', data),
  update: (id, data) => api.patch(`/accounts/users/${id}/`, data),
  delete: (id) => api.delete(`/accounts/users/${id}/`),
  bulkImport: (formData) => api.post('/accounts/bulk-import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const adminApi = {
  // Dashboard
  getDashboardStats: () => api.get('/accounts/dashboard-stats/'),

  // Settings
  getSettings: () => api.get('/accounts/settings/'),
  updateSettings: (data) => api.put('/accounts/settings/', data),

  // Audit Logs
  getLogs: (params) => api.get('/accounts/audit-logs/', { params }),

  // Storage
  getStorageStats: () => api.get('/files/storage-stats/'),
  getLargeFiles: () => api.get('/files/large-files/'),
  getUserStorage: (params) => api.get('/files/user-storage/', { params }),

  // File Management
  deleteFile: (id, data) => api.delete(`/files/admin-delete/${id}/`, { data }),

  // Guest Accounts
  getGuestAccounts: () => api.get('/accounts/guests/'),
  cleanupGuests: () => api.post('/accounts/guests/cleanup/'),
};

export const authApi = {
  login: (credentials) => api.post('/accounts/login/', credentials),
  register: (data) => api.post('/accounts/register/', data),
  logout: (data) => api.post('/accounts/logout/', data),
  getProfile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.patch('/accounts/profile/', data),
  changePassword: (data) => api.post('/accounts/change-password/', data),
  requestPasswordReset: (email) => api.post('/accounts/password/reset/', { email }),
  confirmPasswordReset: (data) => api.post('/accounts/password/reset/confirm/', data),
  guestLogin: () => api.post('/accounts/guest/'),
  convertGuest: (data) => api.post('/accounts/convert-guest/', data),
  verifyEmail: (token) => api.post('/accounts/verify-email/', { token }),
  resendVerification: (email) => api.post('/accounts/resend-verification/', { email }),
  exportData: () => api.get('/accounts/export/'),
  deleteAccount: () => api.delete('/accounts/me/'),
};

export default api;
