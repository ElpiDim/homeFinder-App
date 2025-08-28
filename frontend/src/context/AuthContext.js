// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import http from "../api/";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Rehydrate from localStorage on first load
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [authReady, setAuthReady] = useState(false);

  // Keep API Authorization header in sync with token
  useEffect(() => {
     if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete http.defaults.headers.common.Authorization;
  }, [token]);

  // Verify token / refresh user once on mount
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      if (!token) { setAuthReady(true); return; }
      try {
        const res = await http.get("/users/me");
        const data = res.data?.user || res.data; // handle either shape
        if (!cancelled && data) {
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
        }
      } catch {
        // invalid token -> clear
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    bootstrap();
    return () => { cancelled = true; };
  }, []); // run once

  // Optional helpers
  const login = async (email, password) => {
    const res = await http.post("/auth/login", { email, password });
    const tk = res.data.token;
    const usr = res.data.user;
    setToken(tk);
    setUser(usr);
    localStorage.setItem("token", tk);
    localStorage.setItem("user", JSON.stringify(usr));
    http.defaults.headers.common.Authorization = `Bearer ${tk}`;
    return usr;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete http.defaults.headers.common.Authorization;
  };

  const value = useMemo(() => ({
    user, setUser,
    token, setToken,
    login, logout,
    authReady,
  }), [user, token, authReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
