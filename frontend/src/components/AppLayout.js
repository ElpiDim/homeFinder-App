import React, { useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate, matchPath } from "react-router-dom";
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

export default function AppLayout() {
  const { user, logout, token } = useAuth();
  const { unreadChats } = useMessages();
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

  const menuItems = useMemo(() => {
    if (user?.role === "owner") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
        { label: "Calendar", path: "/calendar", icon: "calendar_month" },
        { label: "Messages", path: "/messages", icon: "chat", match: ["/chat"] },
        { label: "Settings", path: "/settings", icon: "settings", match: ["/edit-profile"] },
      ];
    }
    return [
      { label: "My Matches", path: "/dashboard", icon: "home" },
      { label: "Favorites", path: "/favorites", icon: "favorite" },
      { label: "Appointments", path: "/appointments", icon: "calendar_month" },
      { label: "Messages", path: "/messages", icon: "chat", match: ["/chat"] },
      { label: "Settings", path: "/settings", icon: "settings", match: ["/edit-profile"] },
    ];
  }, [user?.role]);

  // Better active check using matchPath
  const isActive = (basePath, extra = []) => {
    const patterns = [basePath, ...(extra || [])];
    return patterns.some((p) => matchPath({ path: p, end: false }, location.pathname));
  };

  // works with <Routes>)
  const topbar = useMemo(() => {
    const role = user?.role;

    // You can tweak these labels anytime
    const routes = [
      { path: "/dashboard", title: role === "owner" ? "Dashboard" : "Your Matched Properties", subtitle: role === "owner" ? "Overview of your properties" : "Properties selected based on your preferences." },
      { path: "/favorites", title: "Your Favorites", subtitle: "Your saved listings" },
      { path: "/appointments", title: "Your Appointments", subtitle: "Track your property viewings and manage appointments" },
      { path: "/appointments", title: role === "owner" ? "Appointments" : "Appointments", subtitle: role === "owner" ? "Your scheduled viewings" : "Your scheduled viewings" },
      { path: "/messages", title: "Your Messages", subtitle: "Chat with owners and agents" },
      { path: "/chat/:propertyId/:userId", title: "Messages", subtitle: "Chat with owners and agents" },
      { path: "/settings", title: "Settings", subtitle: "Manage your account" },
      { path: "/profile", title: "Profile", subtitle: "View your account details" },
      { path: "/edit-profile", title: "Edit Profile", subtitle: "Update your information" },
      { path: "/add-property", title: "Add Property", subtitle: "Create a new listing" },
      { path: "/property/:propertyId", title: "Property Details", subtitle: "View listing information" },
      { path: "/my-properties", title: role === "owner" ? "My Properties" : "My Properties", subtitle: "Manage your listings" },
    ];

    const found = routes.find((r) => matchPath({ path: r.path, end: false }, location.pathname));
    if (!found) return { title: "", subtitle: "" };
    return { title: found.title || "", subtitle: found.subtitle || "" };
  }, [location.pathname, user?.role]);

  const showTopbar = Boolean(topbar.title || topbar.subtitle);

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
                className={`cd-navlink ${isActive(item.path, item.match) ? "active" : ""}`}
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
                  <div className="cd-role">{user?.role === "owner" ? "Owner" : "Client"}</div>
                </div>
              </div>
            </Link>

            <button className="cd-logout-btn w-100 mt-3" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="cd-main">
          {showTopbar && (
            <header className="cd-topbar">
              <div>
                {topbar.title && <div className="cd-title">{topbar.title}</div>}
                {topbar.subtitle && <div className="cd-subtitle">{topbar.subtitle}</div>}
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
