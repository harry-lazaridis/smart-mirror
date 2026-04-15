// src/components/admin/SLSettings.jsx
import { useState } from "react";

export default function SLSettings() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const save = () => {
    console.log("SL route saved:", { from, to });
    alert("Saved SL route (backend integration next)");
  };

  return (
    <div style={styles.card}>
      <h2>SL Transport</h2>

      <input
        placeholder="From station"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        style={styles.input}
      />

      <input
        placeholder="To destination"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        style={styles.input}
      />

      <button onClick={save} style={styles.button}>
        Save Route
      </button>
    </div>
  );
}

const styles = {
  card: {
    padding: 20,
    background: "#1e293b",
    borderRadius: 12,
  },
  input: {
    display: "block",
    margin: "10px 0",
    padding: 10,
    width: "100%",
  },
  button: {
    padding: "10px 15px",
    cursor: "pointer",
  },
};