import React, { useEffect, useState } from "react";

import { api } from "../../api/client.js";

export default function WeatherWidget() {
    /*
        // https://dev.to/choiruladamm/how-to-use-geolocation-api-using-reactjs-ndk
        [x] Create a form for the user to pass in current location if 'navigator' does not work
    */

    const [weather, setWeather] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            if (!navigator.geolocation) {
                setError("Location unable to fetch");
                setLoading(false);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;

                        const res = await api.get("/api/util/weather", {
                            params: { lat: latitude, long: longitude}
                        });

                        setWeather(res.data);
                    } catch (error) {
                        setError(error);
                    } finally {
                        setLoading(false);
                    }
                },
                (error) => {
                    setError("Error: " + error.message);
                    setLoading(false);
                }
            );
        };

        fetchWeather();

        const interval = setInterval(() => {
            fetchWeather();
        }, 15 * 60 * 1000); // every 15 minutes

        return () => clearInterval(interval);
    }, []);

    if (loading) { return <div style={styles.center}><p style={styles.meta}>Loading weather...</p></div>}
    if (error) { return <div style={styles.center}><p style={styles.meta}>{String(error)}</p></div>}

    return (
        <div style={styles.center}>
            <p style={styles.label}>{weather.city || "Local weather"}</p>
            <h1 style={styles.temp}>{weather.temp}°C</h1>
            <p style={styles.meta}>{weather.description || ""}</p>

            {weather.forecast?.length > 0 && (
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
    )
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
  }
}