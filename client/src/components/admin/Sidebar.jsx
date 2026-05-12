import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import {
  FiBarChart2,
  FiUser,
  FiCalendar,
  FiMap,
  FiFileText,
  FiCheckSquare,
  FiMessageSquare,
  FiGrid,
  FiMonitor,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: FiBarChart2 },
  { id: "profile", label: "Profile", icon: FiUser },
  { id: "calendar", label: "Calendar", icon: FiCalendar },
  { id: "sl", label: "SL Transport", icon: FiMap },
  { id: "news", label: "News", icon: FiFileText },
  { id: "todo", label: "Todo", icon: FiCheckSquare },
  { id: "quotes", label: "Quotes", icon: FiMessageSquare },
  { id: "widgets", label: "Widgets", icon: FiGrid },
  { id: "layout", label: "Mirror Layout", icon: FiMonitor },
  { id: "user", label: "Account", icon: FiSettings },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  // 🔹 Lock page scroll + toggle class
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add("sidebar-is-open");
    } else {
      document.body.classList.remove("sidebar-is-open");
    }

    return () => {
      document.body.classList.remove("sidebar-is-open");
    };
  }, [mobileOpen]);

  // 🔹 Redirect all scroll to sidebar when open
  useEffect(() => {
    if (!mobileOpen) return;

    const handleWheel = (event) => {
      const sidebar = document.querySelector(".sidebar.open");
      if (!sidebar) return;

      event.preventDefault();
      sidebar.scrollTop += event.deltaY;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <button
          className="hamburger-button"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <span className="mobile-header-title">BlackMirror</span>
      </header>

      {/* OVERLAY */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        {/* TOP / BRAND */}
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>

            <div className="brand-text">
              <span className="brand-title">BlackMirror</span>
              <span className="brand-subtitle">Admin Panel</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            (() => {
              const Icon = item.icon;
              return (
            <button
              key={item.id}
              className={`nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="nav-icon">{typeof Icon === "string" ? Icon : <Icon size={16} />}</span>
              <span className="nav-label">{item.label}</span>
            </button>
              );
            })()
          ))}
        </nav>

        {/* BOTTOM / LOGOUT */}
        <div className="sidebar-bottom">
          <button className="logout-button" onClick={handleLogout}>
            <span className="nav-icon"><FiLogOut size={16} /></span>
            <span className="nav-label">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
