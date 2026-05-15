import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { api } from "../../api/client.js";
import Loader from "../common/Loader.jsx";

const DEFAULT_WEATHER_SETTINGS = {
  mode: "device",
  lat: null,
  long: null,
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveUid = async () => {
      if (auth.currentUser?.uid) return auth.currentUser.uid;

      const deviceId = localStorage.getItem("deviceId");
      if (!deviceId) return null;

      const deviceSnap = await getDoc(doc(db, "devices", deviceId));
      return deviceSnap.data()?.uid ?? null;
    };

    const loadWeatherSettings = async (uid) => {
      if (!uid) return DEFAULT_WEATHER_SETTINGS;
      const userSnap = await getDoc(doc(db, "users", uid));
      return { ...DEFAULT_WEATHER_SETTINGS, ...(userSnap.data()?.weatherSettings ?? {}) };
    };

    const fetchByCoords = async (latitude, longitude) => {
      const res = await api.get("/util/weather", {
        params: { lat: latitude, long: longitude },
      });
      setWeather(res.data);
      setError(null);
    };

    const fetchWeather = async () => {
      try {
        const uid = await resolveUid();
        const settings = await loadWeatherSettings(uid);

        if (
          settings.mode === "fixed" &&
          Number.isFinite(Number(settings.lat)) &&
          Number.isFinite(Number(settings.long))
        ) {
          await fetchByCoords(Number(settings.lat), Number(settings.long));
          return;
        }

        if (!navigator.geolocation) {
          setError("Location unavailable. Set fixed coordinates in Admin > Weather.");
          return;
        }

        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const { latitude, longitude } = pos.coords;
                await fetchByCoords(latitude, longitude);
              } catch (err) {
                setError(String(err?.message || err));
              }
              resolve();
            },
            (geoError) => {
              setError(`Geolocation blocked (${geoError.message}). Set fixed coordinates in Admin > Weather.`);
              resolve();
            }
          );
        });
      } catch (err) {
        setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    const interval = setInterval(() => {
      fetchWeather();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={styles.center}><Loader label="Loading weather..." dark compact /></div>;
  if (error) return <div style={styles.center}><p style={styles.meta}>{error}</p></div>;

  return (
    <div style={styles.center}>
      <p style={styles.label}>{weather?.city || "Local weather"}</p>
      <h1 style={styles.temp}>{weather?.temp}°C</h1>
      <p style={styles.meta}>{weather?.description || ""}</p>

      {weather?.forecast?.length > 0 && (
        <div style={styles.forecastRow}>
          {weather.forecast.map((item) => (
            <div key={item.time} style={styles.forecastItem}>
              <p style={styles.forecastTime}>{item.time}</p>
              <p style={styles.forecastTemp}>{item.temp}°C</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  center: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    padding: "8cqi",
    textAlign: "center",
  },
  label: {
    margin: 0,
    opacity: 1,
    fontWeight: 500,
    fontSize: "clamp(10px, 5cqi, 18px)",
  },
  temp: {
    margin: "2cqi 0",
    lineHeight: 1,
    fontSize: "clamp(20px, 18cqi, 84px)",
  },
  meta: {
    margin: 0,
    opacity: 1,
    fontWeight: 500,
    fontSize: "clamp(10px, 5cqi, 18px)",
  },
  forecastRow: {
    marginTop: "4cqi",
    display: "flex",
    gap: "5cqi",
    justifyContent: "center",
    alignItems: "center",
  },
  forecastItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  forecastTime: {
    margin: 0,
    opacity: 1,
    fontWeight: 600,
    fontSize: "clamp(11px, 5cqi, 14px)",
  },
  forecastTemp: {
    margin: 0,
    fontWeight: 600,
    fontSize: "clamp(12px, 6cqi, 18px)",
  },
};
