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

    if (loading) { return <h1>Loading...</h1>}
    if (error) { return <h1>{error}</h1>}

    return (
        <div style={styles.center}>
            <h1>{weather.temp}</h1>
        </div>
    )
}

const styles = {
  center: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },
}