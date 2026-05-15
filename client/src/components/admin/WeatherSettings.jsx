import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Loader from "../common/Loader.jsx";

const DEFAULT_WEATHER_SETTINGS = {
  mode: "device", // device | fixed
  lat: "",
  long: "",
};

export default function WeatherSettings() {
  const [settings, setSettings] = useState(DEFAULT_WEATHER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const snap = await getDoc(doc(db, "users", uid));
        const stored = snap.data()?.weatherSettings ?? {};
        setSettings({ ...DEFAULT_WEATHER_SETTINGS, ...stored });
      } catch (err) {
        console.error("Failed to load weather settings:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const save = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const latNum = settings.lat === "" ? null : Number(settings.lat);
    const longNum = settings.long === "" ? null : Number(settings.long);

    if (settings.mode === "fixed") {
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        alert("Latitude must be between -90 and 90.");
        return;
      }
      if (!Number.isFinite(longNum) || longNum < -180 || longNum > 180) {
        alert("Longitude must be between -180 and 180.");
        return;
      }
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          weatherSettings: {
            mode: settings.mode,
            lat: latNum,
            long: longNum,
          },
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to save weather settings:", err);
      alert("Failed to save weather settings.");
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSettings((prev) => ({
          ...prev,
          mode: "fixed",
          lat: String(latitude),
          long: String(longitude),
        }));
      },
      (error) => {
        alert(`Could not get location: ${error.message}`);
      }
    );
  };

  if (loading) return <div className="settings-card"><Loader label="Loading settings..." compact /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Weather</h1>
        <p>Choose how the mirror gets location for weather.</p>
      </div>

      <div className="settings-card">
        <h2>Location source</h2>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input
            type="radio"
            name="weatherMode"
            checked={settings.mode === "device"}
            onChange={() => setSettings((prev) => ({ ...prev, mode: "device" }))}
            style={{ marginRight: 8 }}
          />
          Use mirror device geolocation
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          <input
            type="radio"
            name="weatherMode"
            checked={settings.mode === "fixed"}
            onChange={() => setSettings((prev) => ({ ...prev, mode: "fixed" }))}
            style={{ marginRight: 8 }}
          />
          Use fixed coordinates (recommended for kiosk)
        </label>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label>Latitude</label>
            <input
              className="settings-input"
              type="number"
              step="any"
              placeholder="e.g. 59.3293"
              value={settings.lat}
              disabled={settings.mode !== "fixed"}
              onChange={(e) => setSettings((prev) => ({ ...prev, lat: e.target.value }))}
            />
          </div>

          <div>
            <label>Longitude</label>
            <input
              className="settings-input"
              type="number"
              step="any"
              placeholder="e.g. 18.0686"
              value={settings.long}
              disabled={settings.mode !== "fixed"}
              onChange={(e) => setSettings((prev) => ({ ...prev, long: e.target.value }))}
            />
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={useCurrentLocation}
          style={{ marginTop: 12 }}
        >
          Use my current location
        </button>

        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
          style={{ marginTop: 16 }}
        >
          {saving ? "Saving..." : "Save weather settings"}
        </button>
      </div>
    </div>
  );
}
