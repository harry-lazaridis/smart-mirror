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
                } catch (error) { setError(error); }
                finally { setLoading(false); }
            },
            (error) => {
                setError("Error: " + error.message);
                setLoading(false)
            }
        )
    }, [])

    if (loading) { return <div style={styles.center}><p style={styles.meta}>Loading weather...</p></div>}
    if (error) { return <div style={styles.center}><p style={styles.meta}>{String(error)}</p></div>}


    /*

    res.json({
      temp:        convertKelvinToCelcius(result.main.temp),
      feels_like:  convertKelvinToCelcius(result.main.feels_like),
      description: result.weather[0].description,
      city:        result.name,
      icon:        result.weather[0].icon,
    });

    */
    return (
        <div style={styles.center}>
            <p style={styles.label}>{weather.city || "Local weather"}</p>
            <h1 style={styles.temp}>{weather.temp}°C</h1>
            <p style={styles.meta}>{weather.description || ""}</p>
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
    opacity: 0.75,
    fontSize: "clamp(10px, 5cqi, 18px)",
  },
  temp: {
    margin: "2cqi 0",
    lineHeight: 1,
    fontSize: "clamp(20px, 18cqi, 84px)",
  },
  meta: {
    margin: 0,
    opacity: 0.9,
    fontSize: "clamp(10px, 5cqi, 18px)",
  }
}
