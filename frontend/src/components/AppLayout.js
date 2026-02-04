import React, { useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate, useMatches } from "react-router-dom";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
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

const resolveByRole = (value, role) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value[role] ?? value.default;
  }
  return undefined;
};

export default function AppLayout() {
  const { user, logout, token } = useAuth();
  const { unreadChats } = useMessages();
  const { collapsed, toggleCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const matches = useMatches();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const profileImg = user?.profilePicture
    ? user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`
    : "/default-avatar.jpg";

  const menuItems = useMemo(() => {
    if (user?.role === "owner") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
        { label: "Calendar", path: "/calendar", icon: "calendar_month" },
        { label: "Messages", path: "/messages", icon: "chat", match: ["/chat"] },
        { label: "Settings", path: "/profile", icon: "settings", match: ["/edit-profile"] },
      ];
    }
    return [
      { label: "My Matches", path: "/dashboard", icon: "home" },
      { label: "Favorites", path: "/favorites", icon: "favorite" },
      { label: "Appointments", path: "/appointments", icon: "calendar_month" },
      { label: "Messages", path: "/messages", icon: "chat", match: ["/chat"] },
      { label: "Settings", path: "/profile", icon: "settings", match: ["/edit-profile"] },
    ];
  }, [user?.role]);

  const activeMatch = (path, matchesList = []) =>
    [path, ...matchesList].some(
      (entry) =>
        location.pathname === entry || location.pathname.startsWith(`${entry}/`)
    );

  const layoutHandle = [...matches]
    .reverse()
    .find((match) => match.handle?.title || match.handle?.subtitle)?.handle;

  const title = resolveByRole(layoutHandle?.title, user?.role);
  const subtitle = resolveByRole(layoutHandle?.subtitle, user?.role);
  const showTopbar = Boolean(title || subtitle);

  return (
    <div className="cd-shell">
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
            {menuItems.map((item) => (
              <Link
                key={item.path}
                className={`cd-navlink ${activeMatch(item.path, item.match) ? "active" : ""}`}
                to={item.path}
              >
                <span className="material-symbols-outlined fill">{item.icon}</span>
                <span className="cd-navText">{item.label}</span>
                {item.path === "/messages" && unreadChats > 0 && (
                  <span className="badge bg-danger ms-auto">{unreadChats}</span>
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
                    {user?.role === "owner" ? "Owner" : "Client"}
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
          {showTopbar && (
            <header className="cd-topbar">
              <div>
                {title && <div className="cd-title">{title}</div>}
                {subtitle && <div className="cd-subtitle">{subtitle}</div>}
              </div>

              <div className="d-flex align-items-center gap-2">
                {token && <NotificationDropdown token={token} className="cd-iconWrap" />}
              </div>
            </header>
          )}

          <div className="cd-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
