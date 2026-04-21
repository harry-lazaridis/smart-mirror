import { useState, useEffect } from "react";
import { auth } from "../../firebase";

export default function CalendarSettings() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("http://localhost:3000/api/auth/google/calendar", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) { setConnected(true); setEvents(data); }
        else setConnected(false);
      } catch (err) {
        console.error("checkConnection error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      checkConnection();
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  const connectGoogle = async () => {
    const token = await auth.currentUser.getIdToken();
    window.location.href = `http://localhost:3000/api/auth/google?token=${token}`;
  };

  if (loading) return <div className="settings-card"><p>Loading...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Calendar</h1>
        <p>Connect your Google Calendar to display events on the mirror.</p>
      </div>

      <div className="settings-card">
        <h2>Google Calendar</h2>

        <p style={{ marginBottom: 16 }}>
          Status:{" "}
          <span style={{ color: connected ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
            {connected ? "● Connected" : "● Not connected"}
          </span>
        </p>

        {!connected && (
          <button onClick={connectGoogle} className="btn-primary">
            Connect Google Calendar
          </button>
        )}

        {connected && (
          <div>
            <h3>Upcoming events</h3>
            {events.length === 0 && (
              <p style={{ color: "#6b7280" }}>No upcoming events.</p>
            )}
            {events.map((event) => (
              <div key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{event.summary}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  {event.start?.dateTime ?? event.start?.date}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}