import React, { useEffect, useState } from "react"

import { api } from "../../api/client"
import { auth } from "../../firebase";


export default function CalendarWidget() {
    
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setEvents([]);
          return;
        }

        const token = await currentUser.getIdToken();
        const res = await api.get("/api/auth/google/calendar", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setEvents(Array.isArray(res.data) ? res.data : []);
        setNeedsReconnect(false);
      } catch (err) {
        const reconnectCode = err?.response?.data?.code;
        setNeedsReconnect(reconnectCode === "GOOGLE_RECONNECT_REQUIRED");
        setEvents([]);
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
  }, []);

  const reconnectGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await currentUser.getIdToken();
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    window.location.href = `${baseURL}/api/auth/google?token=${encodeURIComponent(token)}`;
  };

  if (loading) return <div style={styles.card}>Loading...</div>;
  if (needsReconnect) {
    return (
      <div style={styles.card}>
        <p>Google Calendar needs to be reconnected.</p>
        <button style={styles.button} onClick={reconnectGoogle}>Reconnect Google</button>
      </div>
    );
  }

  //https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
  
  return (
        <div style={styles.card}>
          <h3 style={styles.heading}>Upcoming events</h3>
          {events.length === 0 && <p>No events today</p>}
          {events.map((event) => (
            <div key={event.id} style={styles.event}>
              <strong>{event.summary}</strong>
              <p>{event.start?.dateTime ?? event.start?.date}</p>
            </div>
          ))}
        </div> 
  )
}

const styles = {
  card: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    padding: "6cqi",
    color: "white",
    fontSize: "clamp(11px, 4.5cqi, 18px)",
  },
  heading: {
    margin: "0 0 4cqi",
    fontSize: "clamp(12px, 6cqi, 24px)",
  },
  button: {
    marginTop: 10,
    padding: "2cqi 3cqi",
    cursor: "pointer",
    background: "#4285f4",
    color: "white",
    border: "none",
    borderRadius: "1.8cqi",
  },
  event: {
    padding: "2.6cqi 0",
    borderBottom: "1px solid #334155",
  },
};
