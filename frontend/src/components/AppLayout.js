// src/components/AppLayout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, matchPath } from "react-router-dom";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { useSidebar } from "../context/SidebarContext";
import "../pages/clientDashboard.css";
import AppointmentModal from "../components/AppointmentModal";

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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false
  );
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // ✅ appointment modal from bell dropdown
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncMobile = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) {
        setIsMobileDrawerOpen(false);
      }
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", syncMobile);

    return () => mediaQuery.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      document.body.classList.remove("cd-mobile-drawer-open");
      return;
    }

    document.body.classList.toggle("cd-mobile-drawer-open", isMobileDrawerOpen);
    return () => document.body.classList.remove("cd-mobile-drawer-open");
  }, [isMobile, isMobileDrawerOpen]);

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
        { label: "Add Property", path: "/add-property", icon: "add_home" },
        { label: "Calendar", path: "/calendar", icon: "calendar_month" },
        { label: "Messages", path: "/messages", icon: "chat", match: ["/chat"] },
        { label: "Notifications", path: "/notifications", icon: "notifications" },
      ];
    }
    return [
      { label: "My Matches", path: "/dashboard", icon: "home" },
      { label: "Favorites", path: "/favorites", icon: "favorite" },
      { label: "Appointments", path: "/appointments", icon: "calendar_month" },
      { label: "Messages", path: "/messages", icon: "chat", match: ["/chat"] },
      { label: "Notifications", path: "/notifications", icon: "notifications" },
    ];
  }, [user?.role]);

  const isActive = (basePath, extra = []) => {
    const patterns = [basePath, ...(extra || [])];
    return patterns.some((p) => matchPath({ path: p, end: false }, location.pathname));
  };

  const topbar = useMemo(() => {
    const role = user?.role;

    const routes = [
      {
        path: "/dashboard",
        title: role === "owner" ? "Dashboard" : "Your Matched Properties",
        subtitle:
          role === "owner"
            ? "Overview of your properties"
            : "Properties selected based on your preferences.",
      },
      { path: "/favorites", title: "Your Favorites", subtitle: "Your saved listings" },
      {
        path: "/appointments",
        title: role === "owner" ? "Appointments" : "Your Appointments",
        subtitle: role === "owner" ? "Your scheduled viewings" : "Your scheduled viewings",
      },
      {
        path: "/calendar",
        title: "Calendar",
        subtitle: "Track your property viewings and manage appointments",
      },
      {
        path: "/notifications",
        title: "Notifications",
        subtitle: "Stay updated with your latest matches and alerts",
      },
      { path: "/messages", title: "Your Messages", subtitle: "Chat with owners and agents" },
      { path: "/chat/:propertyId/:userId", title: "Messages", subtitle: "Chat with owners and agents" },
      { path: "/settings", title: "Settings", subtitle: "Manage your account" },
      { path: "/profile", title: "Profile", subtitle: "View your account details" },
      { path: "/edit-profile", title: "Edit Profile", subtitle: "Update your information" },
      { path: "/add-property", title: "Add Property", subtitle: "Create a new listing" },
      { path: "/property/:propertyId", title: "Property Details", subtitle: "View listing information" },
      { path: "/my-properties", title: "My Properties", subtitle: "Manage your listings" },
    ];

    const found = routes.find((r) => matchPath({ path: r.path, end: false }, location.pathname));
    if (!found) return { title: "", subtitle: "" };
    return { title: found.title || "", subtitle: found.subtitle || "" };
  }, [location.pathname, user?.role]);

  const showTopbar = Boolean(topbar.title || topbar.subtitle);

  const handleMenuToggle = () => {
    if (isMobile) {
      setIsMobileDrawerOpen((prev) => !prev);
      return;
    }
    toggleCollapsed();
  };

  const handleMenuItemClick = () => {
    if (isMobile) setIsMobileDrawerOpen(false);
  };

  const asideClassName = [
    "cd-aside",
    !isMobile && collapsed ? "is-collapsed" : "",
    isMobile && isMobileDrawerOpen ? "is-mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isChatRoute = useMemo(() => {
    return Boolean(matchPath({ path: "/chat/:propertyId/:userId", end: false }, location.pathname));
  }, [location.pathname]);

  const isChatLikeRoute = useMemo(() => {
    return (
      Boolean(matchPath({ path: "/messages", end: false }, location.pathname)) ||
      isChatRoute
    );
  }, [location.pathname, isChatRoute]);

  return (
    <div className="cd-shell">
      {isMobile && isMobileDrawerOpen && (
        <button
          type="button"
          className="cd-mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      <div className="cd-layout">
        <aside className={asideClassName}>
          <div className="cd-brand">
            <div className="cd-brandRow">
              <button
                type="button"
                className="cd-toggle cd-toggle--desktop"
                onClick={handleMenuToggle}
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
                onClick={handleMenuItemClick}
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
            <Link
              to="/settings"
              className={`cd-navlink cd-profileLink ${isActive("/settings", ["/edit-profile"]) ? "active" : ""}`}
              onClick={handleMenuItemClick}
            >
              <span className="material-symbols-outlined fill">settings</span>
              <span className="cd-navText">Settings</span>
            </Link>

            <Link to="/profile" className="text-decoration-none" onClick={handleMenuItemClick}>
              <div className="cd-profileRow">
                <img className="cd-avatar" src={profileImg} alt="profile" />
                <div className="cd-profileMeta">
                  <div className="cd-name">{user?.name || "User"}</div>
                  <div className="cd-role">{user?.role === "owner" ? "Owner" : "Client"}</div>
                </div>
              </div>
            </Link>

            <button type="button" className="cd-logout-btn w-100 mt-3" onClick={handleLogout}>
              <span className="material-symbols-outlined fill" aria-hidden="true">logout</span>
              Logout
            </button>
          </div>
        </aside>

        <main className="cd-main">
          {showTopbar && (
            <header className={`cd-topbar ${isChatRoute ? "cd-topbar--compact" : ""}`}>
              <div className="cd-topbarLeft">
                <button
                  type="button"
                  className="cd-toggle cd-toggle--mobile"
                  onClick={handleMenuToggle}
                  aria-label={isMobileDrawerOpen ? "Close menu" : "Open menu"}
                >
                  ☰
                </button>

                {!isChatRoute && (
                  <div>
                    {topbar.title && <div className="cd-title">{topbar.title}</div>}
                    {topbar.subtitle && <div className="cd-subtitle">{topbar.subtitle}</div>}
                  </div>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                {token && (
                  <NotificationDropdown
                    token={token}
                    className="cd-iconWrap"
                    onOpenAppointment={(appointmentId) => setSelectedAppointmentId(appointmentId)}
                  />
                )}
              </div>
            </header>
          )}

          <div className={`cd-content ${isChatLikeRoute ? "cd-content--flush" : ""}`}>
            <Outlet />
          </div>
        </main>
      </div>

      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
    </div>
  );
}
