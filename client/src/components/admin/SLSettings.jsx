import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function SLSettings() {
  const [from, setFrom]                   = useState({ name: "", siteId: "" });
  const [to, setTo]                       = useState({ name: "", siteId: "" });
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [allSites, setAllSites]           = useState([]);
  const [routes, setRoutes]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [saved, setSaved]                 = useState(false);
  const fromRef                            = useRef(null);
  const toRef                              = useRef(null);

  useEffect(() => {
    const fetchSites = async () => {
      const res = await fetch("https://transport.integration.sl.se/v1/sites?expand=true");
      const data = await res.json();
      setAllSites(data);
    };
    fetchSites();

    const loadSaved = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      setRoutes(snap.data()?.slRoutes ?? []);
    };
    loadSaved();

    const handleClickOutside = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) setFromSuggestions([]);
      if (toRef.current && !toRef.current.contains(e.target)) setToSuggestions([]);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = (query, setter) => {
    if (query.length < 2) { setter([]); return; }
    setter(allSites.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6));
  };

  const saveRoutes = async (updatedRoutes) => {
    const uid = auth.currentUser?.uid;
    await setDoc(doc(db, "users", uid), { slRoutes: updatedRoutes }, { merge: true });
  };

  const addRoute = async () => {
    if (!from.siteId || !to.siteId) return;
    if (routes.some(r => r.from.siteId === from.siteId && r.to.siteId === to.siteId)) {
      alert("Finns redan.");
      return;
    }
    setLoading(true);
    try {
      const newRoute = { id: crypto.randomUUID(), from: { name: from.name, siteId: from.siteId }, to: { name: to.name, siteId: to.siteId } };
      const updated = [...routes, newRoute];
      await saveRoutes(updated);
      setRoutes(updated);
      setFrom({ name: "", siteId: "" });
      setTo({ name: "", siteId: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (id) => {
    const updated = routes.filter(r => r.id !== id);
    await saveRoutes(updated);
    setRoutes(updated);
  };

  return (
    <div>
      <div className="page-header">
        <h1>SL Transport</h1>
        <p>Save your commute routes to display on the mirror.</p>
      </div>

      {/* Add route */}
      <div className="settings-card">
        <h2>Add route</h2>

        <label>From</label>
        <div ref={fromRef} style={{ position: "relative", marginBottom: 12 }}>
          <input
            className="settings-input"
            placeholder="Search stop..."
            value={from.name}
            onChange={(e) => { setFrom({ name: e.target.value, siteId: "" }); search(e.target.value, setFromSuggestions); }}
          />
          {fromSuggestions.length > 0 && (
            <div className="dropdown">
              {fromSuggestions.map((s) => (
                <div key={s.id} className="dropdown-item"
                  onClick={() => { setFrom({ name: s.name, siteId: s.id }); setFromSuggestions([]); }}>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <label>To</label>
        <div ref={toRef} style={{ position: "relative", marginBottom: 16 }}>
          <input
            className="settings-input"
            placeholder="Search stop..."
            value={to.name}
            onChange={(e) => { setTo({ name: e.target.value, siteId: "" }); search(e.target.value, setToSuggestions); }}
          />
          {toSuggestions.length > 0 && (
            <div className="dropdown">
              {toSuggestions.map((s) => (
                <div key={s.id} className="dropdown-item"
                  onClick={() => { setTo({ name: s.name, siteId: s.id }); setToSuggestions([]); }}>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={addRoute} disabled={loading}>
          {loading ? "Saving..." : saved ? "✓ Added!" : "+ Add route"}
        </button>
      </div>

      {/* Saved routes */}
      {routes.length > 0 && (
        <div className="settings-card">
          <h2>Saved routes</h2>
          {routes.map((route) => (
            <div key={route.id} className="route-card">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "#111827" }}>{route.from.name}</span>
                </div>
                <div style={{ width: 2, height: 14, background: "#d1d5db", margin: "0 0 4px 3px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "#111827" }}>{route.to.name}</span>
                </div>
              </div>
              <button className="btn-danger" onClick={() => deleteRoute(route.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}