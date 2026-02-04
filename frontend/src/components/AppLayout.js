import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { useNotifications } from "../context/NotificationContext";
import { useSidebar } from "../context/SidebarContext";
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

export default function AppLayout({
  title,
  subtitle,
  headerActions,
  children,
}) {
  const { user, logout, token } = useAuth();
  const { unreadChats } = useMessages();
  const { unreadCount } = useNotifications() || {};
  const { collapsed, toggleCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const profileImg = user?.profilePicture
    ? user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`
    : "/default-avatar.jpg";

  const role = user?.role === "owner" ? "owner" : "client";

  const navItems = useMemo(() => {
    if (role === "owner") {
      return [
        {
          to: "/dashboard",
          icon: "dashboard",
          label: "Dashboard",
        },
        {
          to: "/my-properties",
          icon: "home",
          label: "My Properties",
          matchPaths: ["/my-properties", "/property", "/edit-property"],
        },
        {
          to: "/add-property",
          icon: "add_home",
          label: "Add Property",
        },
        {
          to: "/appointments",
          icon: "calendar_month",
          label: "Appointments",
        },
        {
          to: "/match/clients",
          icon: "group",
          label: "Matches",
        },
        {
          to: "/messages",
          icon: "chat",
          label: "Messages",
          badge: unreadChats,
          matchPaths: ["/messages", "/chat"],
        },
        {
          to: "/notifications",
          icon: "notifications",
          label: "Notifications",
          badge: unreadCount,
        },
        {
          to: "/profile",
          icon: "settings",
          label: "Settings",
          matchPaths: ["/profile", "/edit-profile"],
        },
      ];
    }

    return [
      {
        to: "/dashboard",
        icon: "home",
        label: "My Matches",
      },
      {
        to: "/favorites",
        icon: "favorite",
        label: "Favorites",
      },
      {
        to: "/appointments",
        icon: "calendar_month",
        label: "Appointments",
      },
      {
        to: "/messages",
        icon: "chat",
        label: "Messages",
        badge: unreadChats,
        matchPaths: ["/messages", "/chat"],
      },
      {
        to: "/notifications",
        icon: "notifications",
        label: "Notifications",
        badge: unreadCount,
      },
      {
        to: "/profile",
        icon: "settings",
        label: "Settings",
        matchPaths: ["/profile", "/edit-profile"],
      },
    ];
  }, [role, unreadChats, unreadCount]);

  const isActive = (item) => {
    if (item.matchPaths?.length) {
      return item.matchPaths.some((path) => location.pathname.startsWith(path));
    }
    return location.pathname === item.to;
  };

  return (
    <div className={`cd-shell ${collapsed ? "cd-shell--collapsed" : ""}`}>
      <div className="cd-layout">
        <aside className={`cd-aside ${collapsed ? "is-collapsed" : ""}`}>
          <div className="cd-brand">
            <div className="cd-brandRow">
              <button
                type="button"
                className="cd-toggle"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                ☰
              </button>
              <div className="cd-logo-container" style={{ color: "var(--primary)" }}>
                <Logo as="h5" className="mb-0 logo-in-nav" />
              </div>
            </div>
          </div>

          <nav className="cd-nav">
            {navItems.map((item) => (
              <Link
                key={item.to}
                className={`cd-navlink ${item.badge ? "position-relative" : ""} ${
                  isActive(item) ? "active" : ""
                }`}
                to={item.to}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="cd-navText">{item.label}</span>
                {item.badge > 0 && (
                  <span className="badge bg-danger ms-auto">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>

          <div className="cd-profile">
            <Link to="/profile" className="text-decoration-none">
              <div className="cd-profileRow">
                <img className="cd-avatar" src={profileImg} alt="profile" />
                <div className="cd-profileMeta">
                  <div className="cd-name">{user?.name || "User"}</div>
                  <div className="cd-role">
                    {role === "owner" ? "Property Owner" : "Client"}
                  </div>
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
