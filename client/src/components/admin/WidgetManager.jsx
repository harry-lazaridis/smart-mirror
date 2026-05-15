import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { FiClock, FiCalendar, FiMap, FiCheckSquare, FiCloud, FiFileText, FiMessageSquare, FiCheck, FiX } from "react-icons/fi";

const WIDGETS = [
  { id: "clock",    name: "Clock",         icon: FiClock, description: "Shows current time" },
  { id: "calendar", name: "Calendar",      icon: FiCalendar, description: "Upcoming calendar events" },
  { id: "sl",       name: "SL Departures", icon: FiMap, description: "Next departures from your selected stop" },
  { id: "todo",     name: "Todo",          icon: FiCheckSquare, description: "Your to-do list on the mirror" },
  { id: "weather",  name: "Weather",       icon: FiCloud, description: "Current weather" },
  { id: "news",     name: "News",          icon: FiFileText, description: "Latest headlines" },
  { id: "quotes",   name: "Quotes",        icon: FiMessageSquare, description: "Daily Quotes"},
];

const DEFAULT_POSITIONS = {
  clock:    { x: 10,  y: 10,  w: 250, h: 250 },
  calendar: { x: 10,  y: 100, w: 250, h: 250 },
  sl:       { x: 10,  y: 230, w: 250, h: 250 },
  todo:     { x: 140, y: 230, w: 250, h: 250 },
  weather:  { x: 140, y: 10,  w: 250, h: 250 },
  news:     { x: 140, y: 100, w: 250, h: 250 },
  quotes:   { x: 10,  y: 230, w: 250, h: 250 },
};

export default function WidgetManager() {
  const [mirrorW, setMirrorW] = useState(270);
  const [mirrorH, setMirrorH] = useState(480);
  const [placed, setPlaced]   = useState([]);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data()?.widgetLayout;
      if (data) {
        setMirrorW(data.mirrorW ?? 270);
        setMirrorH(data.mirrorH ?? 480);
        setPlaced(data.placed ?? []);
      }
    };
    load();
  }, []);

  const isActive = (id) => placed.some(p => p.id === id);

  const toggle = (id) => {
    if (isActive(id)) {
      // Deactivate — remove from placed but remember position in lastPositions
      setPlaced(prev => prev.filter(p => p.id !== id));
    } else {
      // Activate — use last known position or default
      const existing = placed.find(p => p.id === id);
      const pos = existing ?? DEFAULT_POSITIONS[id] ?? { x: 10, y: 10, w: 240, h: 240 };
      setPlaced(prev => [...prev, { id, ...pos }]);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      await setDoc(doc(db, "users", uid), {
        widgetLayout: { mirrorW, mirrorH, placed }
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = placed.length;

  return (
    <div>
      <div className="page-header">
        <h1>Widget layout</h1>
        <p>{activeCount} of {WIDGETS.length} widgets enabled on the mirror.</p>
      </div>

      {/* Mirror size */}
      <div className="settings-card" style={{ marginBottom: 20 }}>
        <h2>Mirror size</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            type="number" value={mirrorW} min={200} max={1920}
            className="settings-input" style={{ width: 90 }}
            onChange={(e) => setMirrorW(parseInt(e.target.value) || 200)}
          />
          <span style={{ color: "#6b7280", fontWeight: 500 }}>×</span>
          <input
            type="number" value={mirrorH} min={200} max={1920}
            className="settings-input" style={{ width: 90 }}
            onChange={(e) => setMirrorH(parseInt(e.target.value) || 200)}
          />
          <span style={{ fontSize: 13, color: "#9ca3af" }}>px</span>
        </div>
      </div>

      {/* Widget toggles */}
      <div className="settings-card" style={{ marginBottom: 20 }}>
        <h2>Widgets</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {WIDGETS.map((widget, i) => {
            const active = isActive(widget.id);
            return (
              <div
                key={widget.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  borderBottom: i < WIDGETS.length - 1 ? "1px solid #f3f4f6" : "none",
                  gap: 16,
                }}
              >
                {/* Left: icon + info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: active ? "#eff6ff" : "#f9fafb",
                    border: `1px solid ${active ? "#bfdbfe" : "#e5e7eb"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                    transition: "all 0.2s",
                  }}>
                    <widget.icon size={18} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111827" }}>
                      {widget.name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Right: toggle switch */}
                <button
                  onClick={() => toggle(widget.id)}
                  style={{
                    width: 48, height: 26, borderRadius: 999,
                    background: active ? "#2563eb" : "#d1d5db",
                    border: "none", cursor: "pointer",
                    position: "relative", flexShrink: 0,
                    transition: "background 0.2s",
                    padding: 0,
                  }}
                  title={active ? "Deactivate" : "Activate"}
                >
                  <span style={{
                    position: "absolute",
                    top: 3, left: active ? 25 : 3,
                    width: 20, height: 20,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active summary */}
      {placed.length > 0 && (
        <div className="settings-card" style={{ marginBottom: 20 }}>
          <h2>Active widgets</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {placed.map(p => {
              const w = WIDGETS.find(w => w.id === p.id);
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", background: "#eff6ff",
                  border: "1px solid #bfdbfe", borderRadius: 999,
                  fontSize: 13, color: "#1d4ed8",
                }}>
                  {w?.icon ? <w.icon size={14} /> : null}
                  <span style={{ fontWeight: 500 }}>{w?.name}</span>
                  <button
                    onClick={() => toggle(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#93c5fd", fontSize: 14, padding: "0 0 0 2px", lineHeight: 1 }}
                  ><FiX size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save */}
      <button onClick={save} disabled={loading} className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 15 }}>
        {loading ? "Saving..." : saved ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiCheck size={14} /> Layout saved!</span> : "Save layout"}
      </button>

      <p style={{ marginTop: 12, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
        Positions and sizes are managed automatically based on your latest saved layout.
      </p>
    </div>
  );
}
