import { auth } from "../../firebase";
import { signOut } from "firebase/auth";

const NAV_ITEMS = [
  { id: "profile",  label: "Profile",  icon: "👤" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "sl",       label: "SL Transport", icon: "🚇" },
  { id: "widgets",  label: "Widgets",  icon: "🧩" },
  { id: "layout", label: "Mirror Layout", icon: "🖥️" },
  { id: "user",     label: "Account",  icon: "⚙️" },
];

export default function Sidebar({ activeTab, setActiveTab, mobileOpen }) {
  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  return (
    <aside className="sidebar">

      {/* Brand */}
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="sidebar-bottom">
        <button className="logout-button" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logga ut</span>
        </button>
      </div>

    </aside>
  );
}