import axios from "axios";

const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api", 
  // αν δεν έχεις REACT_APP_API_URL στο .env, θα μιλάει στο ίδιο domain (/api)
});

// Αν υπάρχει token στο localStorage, το στέλνουμε
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
