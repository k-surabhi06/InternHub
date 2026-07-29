import api from './axiosClient';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const internshipsApi = {
  list: (params) => api.get('/internships', { params }),
  get: (id) => api.get(`/internships/${id}`),
  lastSynced: () => api.get('/internships/meta/last-synced'),
};

export const trackerApi = {
  save: (internshipId) => api.post('/tracker', { internshipId }),
  list: (params) => api.get('/tracker', { params }),
  update: (id, data) => api.patch(`/tracker/${id}`, data),
  remove: (id) => api.delete(`/tracker/${id}`),
  stats: () => api.get('/tracker/stats'),
};

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  uploadResume: (payload) => api.post('/profile/resume', payload),
};

export const resumeApi = {
  list: () => api.get('/resumes'),
  upload: (formData) => api.post('/resumes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove: (id) => api.delete(`/resumes/${id}`),
};

export const savedSearchApi = {
  list: () => api.get('/saved-searches'),
  create: (data) => api.post('/saved-searches', data),
  remove: (id) => api.delete(`/saved-searches/${id}`),
};

