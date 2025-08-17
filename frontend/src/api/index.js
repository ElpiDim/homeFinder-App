// src/api/index.js
import axios from 'axios';

// Ένα origin για όλα: στο dev πάει μέσω CRA proxy, στο prod είναι ίδιο origin
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // μόνο αν χρειάζεσαι cookies/sessions
});

// Προαιρετικά: Authorization από localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
