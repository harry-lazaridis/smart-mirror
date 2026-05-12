import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { FiClock, FiCalendar, FiMap, FiCheckSquare, FiCloud, FiFileText, FiMessageSquare, FiCheck, FiX } from "react-icons/fi";

const WIDGETS = [
  { id: "clock",    name: "Clock",         icon: FiClock },
  { id: "calendar", name: "Calendar",      icon: FiCalendar },
  { id: "sl",       name: "SL Departures", icon: FiMap },
  { id: "todo",     name: "Todo",          icon: FiCheckSquare },
  { id: "weather",  name: "Weather",       icon: FiCloud },
  { id: "news",     name: "News",          icon: FiFileText },
  { id: "quotes",   name: "Quotes",        icon: FiMessageSquare },
];

const MIN_SIZE = { w: 60, h: 40 };
const DEFAULT_SIZE = { w: 120, h: 80 };

const isMobile = () => window.innerWidth <= 768;

export default function WidgetLayout() {
  const [mirrorW, setMirrorW] = useState(270);
  const [mirrorH, setMirrorH] = useState(480);
  const [placed, setPlaced]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [touching, setTouching] = useState(null); // for mobile drag
  const canvasRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

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

    const handleKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Mouse resize
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = mirrorW / canvas.getBoundingClientRect().width;
      const dx = (e.clientX - resizing.startX) * scale;
      const dy = (e.clientY - resizing.startY) * scale;
      setPlaced(prev => prev.map(p => p.id !== resizing.id ? p : {
        ...p,
        w: Math.max(MIN_SIZE.w, Math.round(resizing.startW + dx)),
        h: Math.max(MIN_SIZE.h, Math.round(resizing.startH + dy)),
      }));
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing, mirrorW]);

  // Touch drag on canvas
  useEffect(() => {
    if (!touching) return;
    const onMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const scale = mirrorW / canvasRect.width;
      const widget = placed.find(p => p.id === touching.id) ?? { ...DEFAULT_SIZE };
      let x = Math.round(Math.max(0, Math.min((touch.clientX - canvasRect.left - dragOffset.current.x) * scale, mirrorW - widget.w)));
      let y = Math.round(Math.max(0, Math.min((touch.clientY - canvasRect.top - dragOffset.current.y) * scale, mirrorH - widget.h)));
      setPlaced(prev => prev.map(p => p.id === touching.id ? { ...p, x, y } : p));
    };
    const onEnd = () => setTouching(null);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
  }, [touching, mirrorW, mirrorH, placed]);

  const save = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      await setDoc(doc(db, "users", uid), { widgetLayout: { mirrorW, mirrorH, placed } }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Desktop drag & drop
  const onChipDragStart = (e, id) => {
    setDragging({ id, fromList: true });
    dragOffset.current = { x: 0, y: 0 };
  };

  const onPlacedDragStart = (e, p) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging({ id: p.id, fromList: false });
    setSelected(p.id);
  };

  const onCanvasDrop = (e) => {
    e.preventDefault();
    if (!dragging) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scale = mirrorW / canvasRect.width;
    const widget = placed.find(p => p.id === dragging.id) ?? { ...DEFAULT_SIZE };
    const x = Math.round(Math.max(0, Math.min((e.clientX - canvasRect.left - dragOffset.current.x) * scale, mirrorW - widget.w)));
    const y = Math.round(Math.max(0, Math.min((e.clientY - canvasRect.top - dragOffset.current.y) * scale, mirrorH - widget.h)));

    if (dragging.fromList) {
      if (!placed.find(p => p.id === dragging.id)) {
        setPlaced(prev => [...prev, { id: dragging.id, x, y, ...DEFAULT_SIZE }]);
      }
    } else {
      setPlaced(prev => prev.map(p => p.id === dragging.id ? { ...p, x, y } : p));
    }
    setDragging(null);
  };

  // Mobile: tap to add, touch to drag
  const addToCanvas = (id) => {
    if (placed.find(p => p.id === id)) return;
    const x = 10, y = placed.length * 90 + 10;
    setPlaced(prev => [...prev, { id, x, y, ...DEFAULT_SIZE }]);
  };

  const removeWidget = (id) => {
    setPlaced(prev => prev.filter(p => p.id !== id));
    if (selected === id) setSelected(null);
  };

  const updateSelected = (field, val) => {
    const num = Math.max(field === "w" ? MIN_SIZE.w : field === "h" ? MIN_SIZE.h : 0, parseInt(val) || 0);
    setPlaced(prev => prev.map(p => p.id === selected ? { ...p, [field]: num } : p));
  };

  const onWidgetTouchStart = (e, p) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    setTouching({ id: p.id });
    setSelected(p.id);
  };

  const selectedWidget = placed.find(p => p.id === selected);
  const widgetName = (id) => WIDGETS.find(w => w.id === id)?.name ?? id;
  const widgetIcon = (id) => WIDGETS.find(w => w.id === id)?.icon ?? null;
  const placedIds = new Set(placed.map(p => p.id));

  return (
    <div>
      <div className="page-header">
        <h1>Mirror layout</h1>
        <p>Place and resize widgets on the mirror surface.</p>
      </div>

      {/* Mirror size */}
      <div className="settings-card" style={{ marginBottom: 16 }}>
        <h2>Mirror size</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input type="number" value={mirrorW} min={200} max={1920} className="settings-input"
            style={{ width: 90 }} onChange={(e) => setMirrorW(parseInt(e.target.value) || 200)} />
          <span style={{ color: "#6b7280" }}>×</span>
          <input type="number" value={mirrorH} min={200} max={1920} className="settings-input"
            style={{ width: 90 }} onChange={(e) => setMirrorH(parseInt(e.target.value) || 200)} />
          <span style={{ fontSize: 13, color: "#9ca3af" }}>px</span>
        </div>
      </div>

      {/* Widget chips — add to canvas */}
      <div className="settings-card" style={{ marginBottom: 16 }}>
        <h2>Widgets</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          {isMobile() ? "Tap to add to the mirror." : "Drag to the mirror or press + to add."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {WIDGETS.map(w => {
            const active = placedIds.has(w.id);
            return (
              <div
                key={w.id}
                draggable={!active}
                onDragStart={(e) => !active && onChipDragStart(e, w.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: 8, fontSize: 13,
                  cursor: active ? "default" : "grab",
                  background: active ? "#eff6ff" : "#f9fafb",
                  border: `1px solid ${active ? "#bfdbfe" : "#e5e7eb"}`,
                  color: active ? "#1d4ed8" : "#374151",
                  userSelect: "none",
                }}
              >
                <span>{w.icon ? <w.icon size={15} /> : null}</span>
                <span style={{ fontWeight: 500 }}>{w.name}</span>
                {!active ? (
                  <button onClick={() => addToCanvas(w.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontWeight: 700, fontSize: 16, padding: "0 0 0 2px", lineHeight: 1 }}>
                    +
                  </button>
                ) : (
                  <button onClick={() => removeWidget(w.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#93c5fd", fontSize: 13, padding: "0 0 0 2px", lineHeight: 1 }}>
                    <FiX size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas + inspector side by side */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Canvas */}
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onCanvasDrop}
            onClick={() => setSelected(null)}
            style={{
              position: "relative", background: "#020617",
              border: "2px solid #1e3a5f", borderRadius: 12,
              overflow: "hidden", width: "100%",
              aspectRatio: `${mirrorW} / ${mirrorH}`,
              maxWidth: Math.min(mirrorW, 460),
              touchAction: "none",
            }}
          >
            <p style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "#1e3a5f", margin: 0, pointerEvents: "none" }}>
              {mirrorW}×{mirrorH}px
            </p>

            {placed.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: "#1e3a5f", fontSize: 13, margin: 0, textAlign: "center", padding: "0 20px" }}>
                  Add widgets above
                </p>
              </div>
            )}

            {placed.map(p => {
              const scaleX = 100 / mirrorW;
              const scaleY = 100 / mirrorH;
              const isSelected = selected === p.id;
              return (
                <div
                  key={p.id}
                  draggable={!resizing && !touching}
                  onDragStart={(e) => { e.stopPropagation(); onPlacedDragStart(e, p); }}
                  onTouchStart={(e) => { e.stopPropagation(); onWidgetTouchStart(e, p); }}
                  onClick={(e) => { e.stopPropagation(); setSelected(p.id); }}
                  style={{
                    position: "absolute",
                    left: `${p.x * scaleX}%`, top: `${p.y * scaleY}%`,
                    width: `${p.w * scaleX}%`, height: `${p.h * scaleY}%`,
                    background: isSelected ? "#0f2d52" : "#0c1e35",
                    border: `${isSelected ? 1.5 : 1}px solid ${isSelected ? "#3b82f6" : "#1e3a5f"}`,
                    borderRadius: 6, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: "grab", userSelect: "none", overflow: "hidden",
                    boxSizing: "border-box", zIndex: isSelected ? 10 : 1,
                    touchAction: "none",
                  }}
                >
                  <span style={{ fontSize: 14, pointerEvents: "none", display: "inline-flex" }}>
                    {widgetIcon(p.id) ? (() => {
                      const Icon = widgetIcon(p.id);
                      return <Icon size={14} />;
                    })() : null}
                  </span>
                  <span style={{ fontSize: 9, color: isSelected ? "#93c5fd" : "#475569", pointerEvents: "none", marginTop: 2 }}>
                    {widgetName(p.id)}
                  </span>

                  {/* Resize handle — desktop only */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation(); e.preventDefault();
                      setResizing({ id: p.id, startX: e.clientX, startY: e.clientY, startW: p.w, startH: p.h });
                      setSelected(p.id);
                    }}
                    style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 14, height: 14, cursor: "nwse-resize",
                      background: "linear-gradient(135deg, transparent 50%, #3b82f6 50%)",
                      borderBottomRightRadius: 6,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
            Desktop: drag to move · drag corner to resize · click to select
          </p>
          <p style={{ marginTop: 2, fontSize: 11, color: "#9ca3af" }}>
            Mobile: tap and drag to move · select widget below for exact dimensions
          </p>
        </div>

        {/* Inspector — visas när widget är vald */}
        {selectedWidget && (
          <div className="settings-card" style={{ width: 180, flexShrink: 0 }}>
            <h2 style={{ fontSize: 15 }}>
              {(() => {
                const Icon = widgetIcon(selectedWidget.id);
                return Icon ? <Icon size={14} style={{ verticalAlign: "text-bottom", marginRight: 6 }} /> : null;
              })()} {widgetName(selectedWidget.id)}
            </h2>

            {[
              { label: "Width (w)", field: "w" },
              { label: "Height (h)",  field: "h" },
              { label: "X",         field: "x" },
              { label: "Y",         field: "y" },
            ].map(({ label, field }) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 3 }}>{label}</label>
                <input
                  type="number" value={selectedWidget[field]}
                  onChange={(e) => updateSelected(field, e.target.value)}
                  className="settings-input" style={{ padding: "6px 8px", fontSize: 13 }}
                />
              </div>
            ))}

            <button onClick={() => removeWidget(selected)} className="btn-danger" style={{ width: "100%", marginTop: 4 }}>
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Save */}
      <button onClick={save} disabled={loading} className="btn-primary"
        style={{ width: "100%", padding: 14, fontSize: 15, marginTop: 20 }}>
        {loading ? "Saving..." : saved ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiCheck size={14} /> Layout saved!</span> : "Save layout"}
      </button>
    </div>
  );
}
