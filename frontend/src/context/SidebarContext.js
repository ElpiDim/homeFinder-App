import React, { createContext, useContext, useMemo, useState } from "react";

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const setAndStore = (nextValue) => {
    setCollapsed((prev) => (typeof nextValue === "function" ? nextValue(prev) : nextValue));
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
