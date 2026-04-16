import { useState } from "react";

export default function CalendarSettings() {
  const [connected, setConnected] = useState(false);

  const connectGoogle = () => {
    alert("Google Calendar OAuth här snälla");
    setConnected(true);
  };

  return (
    <div style={styles.card}>
      <h2>Calendar Integration</h2>

      <p>Status: {connected ? "Connected" : "Not connected"}</p>

      <button onClick={connectGoogle} style={styles.button}>
        Connect Google Calendar
      </button>
    </div>
  );
}

const styles = {
  card: {
    padding: 20,
    background: "#1e293b",
    borderRadius: 12,
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
    padding: "10px 15px",
    cursor: "pointer",
  },
};