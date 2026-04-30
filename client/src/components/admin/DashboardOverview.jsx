import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function DashboardOverview({ user }) {
  const [userData, setUserData] = useState(null);
  const greetingName = user?.displayName || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data() ?? {});
    });

    return () => unsub();
  }, [user?.uid]);

  const summary = useMemo(() => {
    const layout = userData?.widgetLayout ?? {};
    const placed = Array.isArray(layout.placed) ? layout.placed : [];
    const todos = Array.isArray(userData?.todos) ? userData.todos : [];
    const doneTodos = todos.filter((todo) => todo?.done).length;
    const slStops = Array.isArray(userData?.slStops)
      ? userData.slStops
      : Array.isArray(userData?.slRoutes)
      ? userData.slRoutes
      : [];

    return {
      activeWidgets: placed.length,
      totalWidgets: 6,
      calendarConnected: Boolean(userData?.connectedToCalendar),
      slStops: slStops.length,
      todosTotal: todos.length,
      todosDone: doneTodos,
      mirrorW: layout.mirrorW ?? 270,
      mirrorH: layout.mirrorH ?? 480,
    };
  }, [userData]);

  return (
    <div>
      <div className="page-header">
        <h1>Hello, {greetingName}</h1>
        <p>Quick summary of your Smart Mirror setup.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="card-top">
            <span className="card-title">Active widgets</span>
            <span className="card-corner-icon">🧩</span>
          </div>
          <div className="card-body">
            <div className="stat-value-row">
              <span className="stat-value">{summary.activeWidgets}</span>
              <span className="stat-subtitle">/ {summary.totalWidgets} enabled</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-title">Google Calendar</span>
            <span className="card-corner-icon">📅</span>
          </div>
          <div className="card-body">
            <div className="stat-value-row">
              <span className="stat-value">{summary.calendarConnected ? "Connected" : "Not connected"}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-title">SL stops</span>
            <span className="card-corner-icon">🚇</span>
          </div>
          <div className="card-body">
            <div className="stat-value-row">
              <span className="stat-value">{summary.slStops}</span>
              <span className="stat-subtitle">saved stops</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="card-top">
            <span className="card-title">Todos</span>
            <span className="card-corner-icon">✅</span>
          </div>
          <div className="card-body">
            <div className="stat-value-row">
              <span className="stat-value">{summary.todosDone}</span>
              <span className="stat-subtitle">completed</span>
            </div>
            <p className="stat-subtitle" style={{ marginTop: 6 }}>
              {summary.todosTotal} total tasks
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-title">Mirror resolution</span>
            <span className="card-corner-icon">🖥️</span>
          </div>
          <div className="card-body">
            <div className="stat-value-row">
              <span className="stat-value">{summary.mirrorW} × {summary.mirrorH}</span>
            </div>
            <p className="stat-subtitle" style={{ marginTop: 6 }}>
              configured canvas size
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="card-top">
            <span className="card-title">Account</span>
            <span className="card-corner-icon">👤</span>
          </div>
          <div className="card-body">
            <p className="stat-subtitle" style={{ marginTop: 0 }}>
              {user?.displayName || "No display name"}
            </p>
            <p className="stat-subtitle" style={{ marginTop: 4 }}>
              {user?.email || "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
