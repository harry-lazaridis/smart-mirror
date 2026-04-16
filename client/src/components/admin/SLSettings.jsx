import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function SLSettings() {
  const [from, setFrom] = useState({ name: "", siteId: "" });
  const [to, setTo] = useState({ name: "", siteId: "" });
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fromRef = useRef(null);
  const toRef = useRef(null);

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
      const savedRoutes = snap.data()?.slRoutes ?? [];
      setRoutes(savedRoutes);
    };
    loadSaved();

    const handleClickOutside = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) setFromSuggestions([]);
      if (toRef.current && !toRef.current.contains(e.target)) setToSuggestions([]);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  //Det funkar.
  const search = (query, setter) => {
    if (query.length < 2) { setter([]); return; }
    const matches = allSites
      .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);
    setter(matches);
  };

  const saveRoutes = async (updatedRoutes) => {
    const uid = auth.currentUser?.uid;
    await setDoc(doc(db, "users", uid), { slRoutes: updatedRoutes }, { merge: true });
  };

  const addRoute = async () => {
    if (!from.siteId || !to.siteId) {
      //Popup kanske ifall användaren inte väljer från listan?
      return;
    }

    const alreadyExists = routes.some(
      r => r.from.siteId === from.siteId && r.to.siteId === to.siteId
    );
    if (alreadyExists) {
      alert("Finns redan."); //Mounara.
      return;
    }

    setLoading(true);

    try {
      const newRoute = {
        id: crypto.randomUUID(), //Idiot.
        from: { name: from.name, siteId: from.siteId },
        to:   { name: to.name,   siteId: to.siteId },
      };
      const updatedRoutes = [...routes, newRoute];
      
      await saveRoutes(updatedRoutes);
      setRoutes(updatedRoutes);
      
      setFrom({ name: "", siteId: "" });
      setTo({ name: "", siteId: "" });
      setSaved(true);
      
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Kunde inte spara");
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (id) => {
    const updatedRoutes = routes.filter(r => r.id !== id);
    await saveRoutes(updatedRoutes);
    setRoutes(updatedRoutes);
  };

  return (
    <div style={styles.card}>
      <h2>SL Transport</h2>

      {/* Från */}
      <div ref={fromRef} style={{ position: "relative", margin: "10px 0" }}>
        <input
          placeholder="Från hållplats"
          value={from.name}
          onChange={(e) => {
            setFrom({ name: e.target.value, siteId: "" });
            search(e.target.value, setFromSuggestions);
          }}
          style={styles.input}
        />
        {fromSuggestions.length > 0 && (
          <div style={styles.dropdown}>
            {fromSuggestions.map((s) => (
              <div
                key={s.id}
                onClick={() => { setFrom({ name: s.name, siteId: s.id }); setFromSuggestions([]); }}
                style={styles.item}
                onMouseEnter={e => e.currentTarget.style.background = "#334155"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Till */}
      <div ref={toRef} style={{ position: "relative", margin: "10px 0" }}>
        <input
          placeholder="Till hållplats"
          value={to.name}
          onChange={(e) => {
            setTo({ name: e.target.value, siteId: "" });
            search(e.target.value, setToSuggestions);
          }}
          style={styles.input}
        />
        {toSuggestions.length > 0 && (
          <div style={styles.dropdown}>
            {toSuggestions.map((s) => (
              <div
                key={s.id}
                onClick={() => { setTo({ name: s.name, siteId: s.id }); setToSuggestions([]); }}
                style={styles.item}
                onMouseEnter={e => e.currentTarget.style.background = "#334155"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={addRoute} disabled={loading} style={styles.button}>
        {loading ? "Saving..." : saved ? "Added!" : "+ Add route"}
      </button>

      {/* Sparade rutter */}
      {routes.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12, color: "#94a3b8", fontSize: 14 }}>Saved Routes</h3>
          {routes.map((route) => (
            <div key={route.id} style={styles.routeCard}>
              <div style={{ flex: 1 }}>
                <div style={styles.routeRow}>
                  <span style={styles.dot("green")} />
                  <span>{route.from.name}</span>
                </div>
                <div style={styles.routeLine} />
                <div style={styles.routeRow}>
                  <span style={styles.dot("red")} />
                  <span>{route.to.name}</span>
                </div>
              </div>
              <button
                onClick={() => deleteRoute(route.id)}
                style={styles.deleteButton}
                title="Ta bort rutt"
              >
                X
              </button>
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
    color: "white" 
  },
  
  input: { 
    display: "block", 
    padding: 10, 
    width: "100%", 
    boxSizing: "border-box", 
    background: "#0f172a", 
    color: "white", 
    border: "1px solid #334155", 
    borderRadius: 8 },

  dropdown: { position: "absolute", 
    top: "100%", 
    left: 0, 
    right: 0, 
    background: "#1e293b", 
    border: "1px solid #334155", 
    borderRadius: 8, 
    zIndex: 10, 
    overflow: "hidden" },

  item: { 
    padding: "10px 14px", 
    cursor: "pointer", 
    fontSize: 14 },

  button: { 
    marginTop: 10, 
    padding: "10px 15px", 
    cursor: "pointer", 
    background: "#3b82f6", 
    color: "white", 
    border: "none", 
    borderRadius: 8 },

  routeCard: { 
    display: "flex", 
    alignItems: "center", 
    background: "#0f172a", 
    borderRadius: 8, 
    padding: "12px 16px", 
    marginBottom: 10, 
    gap: 12 },

  routeRow: { 
    display: "flex", 
    alignItems: "center", 
    gap: 8, 
    fontSize: 14 },

  routeLine: { width: 2, 
    height: 16, 
    background: "#334155", 
    margin: "4px 0 4px 5px" },

  dot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color === "green" ? "#4ade80" : "#f87171", flexShrink: 0 }),
  
  deleteButton: { background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 },
};