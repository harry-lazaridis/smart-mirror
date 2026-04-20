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
        
        if (res.ok) {
          setConnected(true);
          setEvents(data);
        } else {
          setConnected(false);
        }
      } catch (err) {
        console.error("checkConnection error:", err); // vad är felet?
      } finally {
        setLoading(false);
      }
    };

    checkConnection();

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      checkConnection();
      window.history.replaceState({}, "", "/admin"); //Fråga inte varför
    }

    console.log(events)
  }, []);

  /**
   * Work around axios för att redirecta google api. kolla om det går bättre för att få in loading.
   */
  const connectGoogle = async () => {
    const token = await auth.currentUser.getIdToken();
    window.location.href = `http://localhost:3000/api/auth/google?token=${token}`;
  };

  if (loading) return <div style={styles.card}>Loading...</div>;

  return (
    <div style={styles.card}>
      <h2>Calendar Integration</h2>

      <p>
        Status:{" "}
        <span style={{ color: connected ? "#4ade80" : "#f87171" }}>
          {connected ? "Connected" : "Not connected"}
        </span>
      </p>

      {!connected && (
        <button onClick={connectGoogle} style={styles.button}>
          Connect Google Calendar
        </button>
      )}

      {connected && (
        <div>
          <h3>Upcoming events</h3>
          {events.length === 0 && <p>No events today</p>}
          {events.map((event) => (
            <div key={event.id} style={styles.event}>
              <strong>{event.summary}</strong>
              <p>{event.start?.dateTime ?? event.start?.date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: 20,
    background: "#1e293b",
    borderRadius: 12,
    marginBottom: 20,
    color: "white",
  },
  button: {
    marginTop: 10,
    padding: "10px 15px",
    cursor: "pointer",
    background: "#4285f4",
    color: "white",
    border: "none",
    borderRadius: 8,
  },
  event: {
    padding: "10px 0",
    borderBottom: "1px solid #334155",
  },
};