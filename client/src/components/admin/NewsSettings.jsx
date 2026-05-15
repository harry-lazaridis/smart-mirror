import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { api } from "../../api/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Loader from "../common/Loader.jsx";

const DEFAULT_SETTINGS = {
  sources: ["svt", "sr_ekot"],
  limit: 8,
};

export default function NewsSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [availableSources, setAvailableSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const [userSnap, sourceRes] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          api.get("/util/news/sources"),
        ]);

        const saved = userSnap.data()?.newsSettings ?? {};
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
        setAvailableSources(Array.isArray(sourceRes.data) ? sourceRes.data : []);
      } catch (err) {
        console.error("Failed to load news settings:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const save = async (nextSettings) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSettings(nextSettings);
    await setDoc(doc(db, "users", uid), { newsSettings: nextSettings }, { merge: true });
  };

  const toggleSource = async (sourceId) => {
    const current = new Set(settings.sources);
    if (current.has(sourceId)) current.delete(sourceId);
    else current.add(sourceId);

    const nextSources = Array.from(current);
    if (nextSources.length === 0) return;
    await save({ ...settings, sources: nextSources });
  };

  if (loading) return <div className="settings-card"><Loader label="Loading settings..." compact /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>News</h1>
        <p>Choose Swedish news sources to show in the mirror news widget.</p>
      </div>

      <div className="settings-card">
        <h2>Sources</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {availableSources.map((source) => (
            <label key={source.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={settings.sources.includes(source.id)}
                onChange={() => toggleSource(source.id)}
              />
              {source.name}
            </label>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h2>Display</h2>
        <label>Headlines in widget</label>
        <input
          className="settings-input"
          type="number"
          min="1"
          max="20"
          value={settings.limit}
          onChange={(e) => save({ ...settings, limit: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
        />
      </div>
    </div>
  );
}
