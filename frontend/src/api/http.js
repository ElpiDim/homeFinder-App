import axios from 'axios';

const http = axios.create({
  // point to your backend origin
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:5000',
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
