import axios from 'axios';

const http = axios.create({
 // Prefix all requests with /api so they reach the Express routes
  // React development server proxies /api to the backend
    // Use explicit backend URL in dev to avoid proxy 404s
  baseURL:
    process.env.REACT_APP_API_BASE ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000/api'
      : '/api'),
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
