import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { FiGrid, FiCalendar, FiMap, FiCheckSquare, FiMonitor, FiUser, FiVolume2, FiVolumeX } from "react-icons/fi";

const DEFAULT_NOTIFICATION_SETTINGS = {
  soundEnabled: false,
  voiceEnabled: true,
};

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

  const notificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(userData?.notificationSettings ?? {}),
  };

  const saveNotificationSettings = async (updates) => {
    if (!user?.uid) return;

    const nextSettings = {
      ...notificationSettings,
      ...updates,
    };

    await setDoc(
      doc(db, "users", user.uid),
      { notificationSettings: nextSettings },
      { merge: true }
    );
  };

  const testVoice = () => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance("Sound notifications are enabled.");
    message.lang = "en-US";
    message.rate = 0.95;
    message.pitch = 1;
    message.volume = 1;

    window.speechSynthesis.speak(message);
  };

  const handleSoundToggle = async () => {
    const nextValue = !notificationSettings.soundEnabled;

    await saveNotificationSettings({
      soundEnabled: nextValue,
    });

    if (nextValue) {
      testVoice();
    }
  };

  const handleVoiceToggle = async () => {
    await saveNotificationSettings({
      voiceEnabled: !notificationSettings.voiceEnabled,
    });
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
            <span className="card-title">Sound notifications</span>
            <span className="card-corner-icon">
              {notificationSettings.soundEnabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
            </span>
          </div>
          <div className="card-body">
            <div className="stat-value-row">
              <span className="stat-value">{notificationSettings.soundEnabled ? "On" : "Off"}</span>
            </div>

            <p className="stat-subtitle" style={{ marginTop: 6 }}>
              Used for calendar reminders, startup ready, and API recovery messages.
            </p>

            <div style={styles.buttonRow}>
              <button style={styles.button} onClick={handleSoundToggle}>
                {notificationSettings.soundEnabled ? "Turn sound off" : "Turn sound on"}
              </button>

              <button style={styles.buttonSecondary} onClick={testVoice}>
                Test voice
              </button>
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={notificationSettings.voiceEnabled}
                onChange={handleVoiceToggle}
                disabled={!notificationSettings.soundEnabled}
              />
              <span>Use spoken voice</span>
            </label>
          </div>
        </div>

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
      </div>

      <div className="stats-grid">
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
    </div>
  );
}

const styles = {
  buttonRow: {
    display: "flex",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  button: {
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#111827",
    color: "white",
    fontWeight: 600,
  },
  buttonSecondary: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    background: "white",
    color: "#111827",
    fontWeight: 600,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
};