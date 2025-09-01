import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// κάθε φορά που φεύγει request, βάζουμε φρέσκο token από localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
