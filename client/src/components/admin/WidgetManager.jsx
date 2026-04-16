import { useState } from "react";

export default function WidgetManager() {
  const [widgets, setWidgets] = useState([
    { id: 1, name: "Clock", enabled: true },
    { id: 2, name: "Calendar", enabled: true },
    { id: 3, name: "SL Departures", enabled: false },
  ]);

  const toggle = (id) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  return (
    <div style={styles.card}>
      <h2>Widgets</h2>

      {widgets.map((w) => (
        <div key={w.id} style={styles.row}>
          <span>{w.name}</span>

          <button onClick={() => toggle(w.id)}>
            {w.enabled ? "Disable" : "Enable"}
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    padding: 20,
    background: "#1e293b",
    borderRadius: 12,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
  },
};