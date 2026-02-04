import React, { createContext, useContext, useMemo, useState } from "react";

const SidebarContext = createContext(null);

const STORAGE_KEY = "appSidebarCollapsed";

export const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  const setAndStore = (nextValue) => {
    setCollapsed((prev) => {
      const resolved = typeof nextValue === "function" ? nextValue(prev) : nextValue;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(resolved));
      }
      return resolved;
    });
  };

  const toggleCollapsed = () => setAndStore((prev) => !prev);

  const value = useMemo(
    () => ({ collapsed, setCollapsed: setAndStore, toggleCollapsed }),
    [collapsed]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
};
