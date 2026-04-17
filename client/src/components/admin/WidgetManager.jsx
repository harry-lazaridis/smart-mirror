import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const WIDGETS = [
  { id: "clock",    name: "Clock" },
  { id: "calendar", name: "Calendar" },
  { id: "sl",       name: "SL Departures" },
  { id: "weather",  name: "Weather" },
  { id: "news",     name: "News" },
];

const DEFAULT_SIZE = { w: 120, h: 80 };
const MIN_SIZE = { w: 60, h: 40 };

export default function WidgetManager() {
  const [mirrorW, setMirrorW]         = useState(270);
  const [mirrorH, setMirrorH]         = useState(480);
  const [placed, setPlaced]           = useState([]);
  const [available, setAvailable]     = useState(WIDGETS.map(w => w.id));
  const [selected, setSelected]       = useState(null); // id of selected widget
  const [dragging, setDragging]       = useState(null);
  const [resizing, setResizing]       = useState(null); // { id, startX, startY, startW, startH }
  const [saved, setSaved]             = useState(false);
  const [loading, setLoading]         = useState(false);
  const canvasRef                      = useRef(null);
  const dragOffset                     = useRef({ x: 0, y: 0 });

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
        const usedIds = (data.placed ?? []).map(p => p.id);
        setAvailable(WIDGETS.map(w => w.id).filter(id => !usedIds.includes(id)));
      }
    };
    load();

    const handleKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Global mouse move/up for resizing
  useEffect(() => {
    if (!resizing) return;

    const onMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const scale = mirrorW / canvasRect.width;

      const dx = (e.clientX - resizing.startX) * scale;
      const dy = (e.clientY - resizing.startY) * scale;

      setPlaced(prev => prev.map(p => {
        if (p.id !== resizing.id) return p;
        return {
          ...p,
          w: Math.max(MIN_SIZE.w, Math.round(resizing.startW + dx)),
          h: Math.max(MIN_SIZE.h, Math.round(resizing.startH + dy)),
        };
      }));
    };

    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, mirrorW]);

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

  const onSidebarDragStart = (e, widgetId) => {
    setDragging({ id: widgetId, fromSidebar: true });
    dragOffset.current = { x: 0, y: 0 };
  };

  const onPlacedDragStart = (e, p) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const canvas = canvasRef.current.getBoundingClientRect();
    const scale = mirrorW / canvas.width;
    dragOffset.current = {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
    setDragging({ id: p.id, fromSidebar: false });
    setSelected(p.id);
  };

  const onCanvasDrop = (e) => {
    e.preventDefault();
    if (!dragging) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scale = mirrorW / canvasRect.width;

    let x = (e.clientX - canvasRect.left - dragOffset.current.x) * scale;
    let y = (e.clientY - canvasRect.top  - dragOffset.current.y) * scale;

    const widget = placed.find(p => p.id === dragging.id) ?? { ...DEFAULT_SIZE };
    x = Math.max(0, Math.min(x, mirrorW - widget.w));
    y = Math.max(0, Math.min(y, mirrorH - widget.h));
    x = Math.round(x);
    y = Math.round(y);

    if (dragging.fromSidebar) {
      setPlaced(prev => [...prev, { id: dragging.id, x, y, ...DEFAULT_SIZE }]);
      setAvailable(prev => prev.filter(id => id !== dragging.id));
    } else {
      setPlaced(prev => prev.map(p => p.id === dragging.id ? { ...p, x, y } : p));
    }
    setDragging(null);
  };

  const removeWidget = (widgetId) => {
    setPlaced(prev => prev.filter(p => p.id !== widgetId));
    setAvailable(prev => [...prev, widgetId]);
    if (selected === widgetId) setSelected(null);
  };

  const updateSelected = (field, val) => {
    const num = Math.max(field === "w" ? MIN_SIZE.w : field === "h" ? MIN_SIZE.h : 0, parseInt(val) || 0);
    setPlaced(prev => prev.map(p => p.id === selected ? { ...p, [field]: num } : p));
  };

  const selectedWidget = placed.find(p => p.id === selected);
  const widgetName = (id) => WIDGETS.find(w => w.id === id)?.name ?? id;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Widget layout</h2>
        <button onClick={save} disabled={loading} style={styles.saveBtn}>
          {loading ? "Saving..." : saved ? "Saved!" : "Save layout"}
        </button>
      </div>

      {/* Mirror size controls */}
      <div style={styles.controlRow}>
        <span style={styles.controlLabel}>Mirror Size</span>
        <div style={styles.sizeInputGroup}>
          <label style={styles.dimLabel}>B</label>
          <input
            type="number" value={mirrorW} min={200} max={1920}
            onChange={(e) => { setMirrorW(parseInt(e.target.value) || 200); setPlaced([]); setAvailable(WIDGETS.map(w => w.id)); }}
            style={styles.dimInput}
          />
          <span style={styles.dimSep}>×</span>
          <label style={styles.dimLabel}>H</label>
          <input
            type="number" value={mirrorH} min={200} max={1920}
            onChange={(e) => { setMirrorH(parseInt(e.target.value) || 200); setPlaced([]); setAvailable(WIDGETS.map(w => w.id)); }}
            style={styles.dimInput}
          />
          <span style={styles.dimUnit}>px</span>
        </div>
      </div>

      <div style={styles.workspace}>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <p style={styles.sidebarLabel}>Tillgängliga</p>
          {available.length === 0 && <p style={styles.empty}>Alla placerade</p>}
          {available.map(id => (
            <div
              key={id}
              draggable
              onDragStart={(e) => onSidebarDragStart(e, id)}
              style={styles.chip}
            >
              {widgetName(id)}
            </div>
          ))}

          {/* Selected widget inspector */}
          {selectedWidget && (
            <div style={styles.inspector}>
              <p style={styles.inspectorTitle}>{widgetName(selectedWidget.id)}</p>

              <label style={styles.inspectorLabel}>Bredd</label>
              <input type="number" value={selectedWidget.w} min={MIN_SIZE.w}
                onChange={(e) => updateSelected("w", e.target.value)} style={styles.inspectorInput} />

              <label style={styles.inspectorLabel}>Höjd</label>
              <input type="number" value={selectedWidget.h} min={MIN_SIZE.h}
                onChange={(e) => updateSelected("h", e.target.value)} style={styles.inspectorInput} />

              <label style={styles.inspectorLabel}>X</label>
              <input type="number" value={selectedWidget.x}
                onChange={(e) => updateSelected("x", e.target.value)} style={styles.inspectorInput} />

              <label style={styles.inspectorLabel}>Y</label>
              <input type="number" value={selectedWidget.y}
                onChange={(e) => updateSelected("y", e.target.value)} style={styles.inspectorInput} />

              <button onClick={() => removeWidget(selected)} style={styles.removeFromInspector}>
                Ta bort widget
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onCanvasDrop}
            onClick={() => setSelected(null)}
            style={{
              ...styles.canvas,
              aspectRatio: `${mirrorW} / ${mirrorH}`,
              maxWidth: Math.min(mirrorW, 460),
            }}
          >
            <p style={styles.canvasLabel}>{mirrorW}×{mirrorH}px</p>

            {placed.map(p => {
              const scaleX = 100 / mirrorW;
              const scaleY = 100 / mirrorH;
              const isSelected = selected === p.id;
              return (
                <div
                  key={p.id}
                  draggable={!resizing}
                  onDragStart={(e) => { e.stopPropagation(); onPlacedDragStart(e, p); }}
                  onClick={(e) => { e.stopPropagation(); setSelected(p.id); }}
                  style={{
                    ...styles.placedWidget,
                    left:   `${p.x * scaleX}%`,
                    top:    `${p.y * scaleY}%`,
                    width:  `${p.w * scaleX}%`,
                    height: `${p.h * scaleY}%`,
                    border: isSelected ? "1.5px solid #60a5fa" : "1px solid #3b82f6",
                    zIndex: isSelected ? 10 : 1,
                  }}
                >
                  <span style={styles.widgetLabel}>{widgetName(p.id)}</span>

                  {/* Resize handle */}
                  <div
                    style={styles.resizeHandle}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setResizing({ id: p.id, startX: e.clientX, startY: e.clientY, startW: p.w, startH: p.h });
                      setSelected(p.id);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p style={styles.hint}>
        Drag & Drop!
      </p>
    </div>
  );
}

const styles = {
  page: { padding: 20, color: "white" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  saveBtn: { padding: "8px 18px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, cursor: "pointer" },
  controlRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  controlLabel: { fontSize: 13, color: "#94a3b8" },
  sizeInputGroup: { display: "flex", alignItems: "center", gap: 6 },
  dimLabel: { fontSize: 13, color: "#64748b" },
  dimInput: { width: 70, padding: "6px 8px", background: "#0f172a", color: "white", border: "1px solid #334155", borderRadius: 6, fontSize: 13 },
  dimSep: { color: "#475569", fontSize: 16 },
  dimUnit: { fontSize: 12, color: "#475569" },
  workspace: { display: "flex", gap: 20, alignItems: "flex-start" },
  sidebar: { width: 150, flexShrink: 0 },
  sidebarLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" },
  empty: { fontSize: 12, color: "#475569", fontStyle: "italic" },
  chip: { padding: "8px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, marginBottom: 8, cursor: "grab", fontSize: 13, userSelect: "none" },
  inspector: { marginTop: 20, padding: 12, background: "#0f172a", borderRadius: 8, border: "1px solid #334155" },
  inspectorTitle: { fontSize: 13, fontWeight: 500, color: "#60a5fa", margin: "0 0 10px" },
  inspectorLabel: { display: "block", fontSize: 11, color: "#64748b", marginBottom: 2, marginTop: 8 },
  inspectorInput: { width: "100%", padding: "5px 8px", background: "#1e293b", color: "white", border: "1px solid #334155", borderRadius: 6, fontSize: 13, boxSizing: "border-box" },
  removeFromInspector: { marginTop: 12, width: "100%", padding: "7px", background: "transparent", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  canvas: { position: "relative", background: "#020617", border: "2px solid #334155", borderRadius: 12, overflow: "hidden", width: "100%" },
  canvasLabel: { position: "absolute", bottom: 6, right: 10, fontSize: 10, color: "#1e3a5f", margin: 0, pointerEvents: "none" },
  placedWidget: { position: "absolute", background: "#0c1e35", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", userSelect: "none", overflow: "hidden", boxSizing: "border-box" },
  widgetLabel: { fontSize: 10, color: "#93c5fd", pointerEvents: "none" },
  resizeHandle: { position: "absolute", bottom: 0, right: 0, width: 14, height: 14, cursor: "nwse-resize", background: "linear-gradient(135deg, transparent 50%, #3b82f6 50%)", borderBottomRightRadius: 6 },
};