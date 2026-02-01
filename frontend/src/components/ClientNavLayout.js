import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import "../pages/clientDashboard.css";

const API_ORIGIN =
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "") || (typeof window !== "undefined" ? window.location.origin : "");

function normalizeUploadPath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  const clean = src.replace(/^\/+/, "");
  return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
}

export default function ClientNavLayout({
  title,
  subtitle,
  headerActions,
  children,
}) {
  const { user, logout, token } = useAuth();
  const { unreadChats } = useMessages();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(location.pathname !== "/dashboard");

  useEffect(() => {
    setIsCollapsed(location.pathname !== "/dashboard");
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const profileImg = user?.profilePicture
    ? user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`
    : "/default-avatar.jpg";

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`cd-shell ${isCollapsed ? "cd-shell--collapsed" : ""}`}>
      <div className="cd-layout">
        <aside className={`cd-aside ${isCollapsed ? "is-collapsed" : ""}`}>
          <div className="cd-brand">
            <div style={{ color: "var(--primary)" }}>
              <Logo as="h5" className="mb-0 logo-in-nav">
                {isCollapsed ? "🏠" : null}
              </Logo>
            </div>
          </div>

          <nav className="cd-nav">
            <Link
              className={`cd-navlink ${isActive("/dashboard") ? "active" : ""}`}
              to="/dashboard"
              onClick={() => setIsCollapsed(true)}
            >
              <span className="material-symbols-outlined fill">home</span>
              <span className="cd-navText">My Matches</span>
            </Link>

            <Link
              className={`cd-navlink ${isActive("/favorites") ? "active" : ""}`}
              to="/favorites"
              onClick={() => setIsCollapsed(true)}
            >
              <span className="material-symbols-outlined">favorite</span>
              <span className="cd-navText">Favorites</span>
            </Link>

            <Link
              className={`cd-navlink ${isActive("/appointments") ? "active" : ""}`}
              to="/appointments"
              onClick={() => setIsCollapsed(true)}
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="cd-navText">Appointments</span>
            </Link>

            <Link
              className={`cd-navlink position-relative ${isActive("/messages") ? "active" : ""}`}
              to="/messages"
              onClick={() => setIsCollapsed(true)}
            >
              <span className="material-symbols-outlined">chat</span>
              <span className="cd-navText">Messages</span>
              {unreadChats > 0 && <span className="badge bg-danger ms-auto">{unreadChats}</span>}
            </Link>

            <Link
              className={`cd-navlink ${isActive("/profile") ? "active" : ""}`}
              to="/profile"
              onClick={() => setIsCollapsed(true)}
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="cd-navText">Settings</span>
            </Link>
          </nav>

          <div className="cd-profile">
            <Link to="/profile" className="text-decoration-none">
              <div className="cd-profileRow">
                <img className="cd-avatar" src={profileImg} alt="profile" />
                <div className="cd-profileMeta">
                  <div className="cd-name">{user?.name || "Client"}</div>
                  <div className="cd-role">Client</div>
                </div>
              </div>
            </Link>

            <button className="btn btn-outline-secondary w-100 mt-3" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="cd-main">
          {(title || subtitle || headerActions !== undefined) && (
            <header className="cd-topbar">
              <div>
                {title && <div className="cd-title">{title}</div>}
                {subtitle && <div className="cd-subtitle">{subtitle}</div>}
              </div>

              <div className="d-flex align-items-center gap-2">
                {headerActions}
                <NotificationDropdown token={token} className="cd-iconWrap" />
              </div>
            </header>
          )}

          <div className="cd-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
