import React from "react";
import { useAuth } from "../context/AuthContext";
import OwnerDashboard from "./ownerDashboard";
import ClientDashboard from "./clientDashboard";

export default function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;

  return user.role === "owner" ? <OwnerDashboard /> : <ClientDashboard />;
}
