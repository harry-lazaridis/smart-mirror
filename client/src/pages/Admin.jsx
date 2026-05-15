import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

import Sidebar from "../components/admin/Sidebar";
import DashboardOverview from "../components/admin/DashboardOverview";
import ProfileCard from "../components/admin/ProfileCard";
import CalendarSettings from "../components/admin/CalendarSettings";
import SLSettings from "../components/admin/SLSettings";
import NewsSettings from "../components/admin/NewsSettings";
import TodoSettings from "../components/admin/TodoSettings";
import QuoteSettings from "../components/admin/QuoteSettings";
import WeatherSettings from "../components/admin/WeatherSettings";
import WidgetManager from "../components/admin/WidgetManager";
import UserManager from "../components/admin/UserManager";
import WidgetLayout from "../components/admin/WidgetLayout";


export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") return "calendar";
    return "dashboard";
  });
  //const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2>Please login to access admin panel</h2>
      </div>
    );
  }

  /*return (
    <div className="app-shell">

      {/* Mobile header *//*}
      <header className="mobile-header">
        <button className="hamburger-button" onClick={() => setMobileOpen(true)}>
          <span /><span /><span />
        </button>
        <span className="mobile-header-title">BlackMirror</span>
      </header>

      {/* Overlay when mobile menu is open *//*}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setMobileOpen(false); }}
        mobileOpen={mobileOpen}
      />

      <main className="app-content" style={{ marginLeft: 245, padding: 32, width: "calc(100% - 245px)" }}>
        <div className="page">
          {activeTab === "dashboard" && <DashboardOverview user={user} />}
          {activeTab === "profile"  && <ProfileCard user={user} />}
          {activeTab === "calendar" && <CalendarSettings user={user} />}
          {activeTab === "sl"       && <SLSettings user={user} />}
          {activeTab === "news"     && <NewsSettings user={user} />}
          {activeTab === "todo"     && <TodoSettings user={user} />}
          {activeTab === "widgets"  && <WidgetManager user={user} />}
          {activeTab === "layout" && <WidgetLayout user={user} />}
          {activeTab === "user"     && <UserManager user={user} />}
        </div>
      </main>

    </div>
  );*/


  return (
    <div className="app-shell">

          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab}/>

      <main className="app-content">
        <div className="page">
          {activeTab === "dashboard" && <DashboardOverview user={user} />}
          {activeTab === "profile"  && <ProfileCard user={user} />}
          {activeTab === "calendar" && <CalendarSettings user={user} />}
          {activeTab === "sl"       && <SLSettings user={user} />}
          {activeTab === "news"     && <NewsSettings user={user} />}
          {activeTab === "todo"     && <TodoSettings user={user} />}
          {activeTab === "quotes"   && <QuoteSettings user={user} />}
          {activeTab === "weather"  && <WeatherSettings user={user} />}
          {activeTab === "widgets"  && <WidgetManager user={user} />}
          {activeTab === "layout" && <WidgetLayout user={user} />}
          {activeTab === "user"     && <UserManager user={user} />}
        </div>
      </main>

    </div>
  );
}
