import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { FiGrid, FiCalendar, FiMap, FiCheckSquare, FiMonitor, FiUser } from "react-icons/fi";

export default function DashboardOverview({ user }) {
  const [userData, setUserData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [removingDeviceId, setRemovingDeviceId] = useState(null);
  const greetingName = user?.displayName || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (!user?.uid) return undefined;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserData(snap.data() ?? {});
    });

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const devicesQuery = query(collection(db, "devices"), where("uid", "==", user.uid));
    const unsub = onSnapshot(devicesQuery, (snapshot) => {
      setDevices(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    });

    return () => unsub();
  }, [user?.uid]);

  const removeDevice = async (deviceId) => {
    if (!deviceId) return;
    const confirmed = window.confirm("Remove this device? The mirror will return to sync mode.");
    if (!confirmed) return;

    setRemovingDeviceId(deviceId);
    try {
      await deleteDoc(doc(db, "devices", deviceId));
    } catch (error) {
      console.error("Failed to remove device:", error);
      alert("Failed to remove device. Please try again.");
    } finally {
      setRemovingDeviceId(null);
    }
  };

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
      totalWidgets: 7,
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
            <span className="card-corner-icon"><FiGrid size={16} /></span>
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
            <span className="card-corner-icon"><FiCalendar size={16} /></span>
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
            <span className="card-corner-icon"><FiMap size={16} /></span>
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
            <span className="card-corner-icon"><FiCheckSquare size={16} /></span>
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
            <span className="card-corner-icon"><FiMonitor size={16} /></span>
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
            <span className="card-corner-icon"><FiUser size={16} /></span>
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

      <div className="settings-card" style={{ marginTop: 24 }}>
        <h2>Connected devices</h2>
        <p className="stat-subtitle" style={{ marginTop: 0 }}>
          Removing a device sends that mirror back to sync mode.
        </p>

        {devices.length === 0 ? (
          <p className="stat-subtitle">No connected devices yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {devices.map((device) => (
              <div
                key={device.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{device.id}</div>
                  <div className="stat-subtitle" style={{ marginTop: 2 }}>
                    Linked by: {device.linkedBy || "Unknown"}
                  </div>
                </div>
                <button
                  className="btn-danger"
                  disabled={removingDeviceId === device.id}
                  onClick={() => removeDevice(device.id)}
                >
                  {removingDeviceId === device.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
