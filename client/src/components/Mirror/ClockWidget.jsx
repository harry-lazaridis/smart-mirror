import React, { useState, useEffect } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={styles.center}>
      <p style={styles.label}>Time</p>
      <h1 style={styles.time}>{time.toLocaleTimeString("en-US")}</h1>
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
    opacity: 0.7,
    letterSpacing: "0.08em",
    fontSize: "clamp(10px, 6cqi, 20px)",
    textTransform: "uppercase",
  },
  time: {
    margin: "3cqi 0 0",
    lineHeight: 1.05,
    fontWeight: 700,
    fontSize: "clamp(18px, 15cqi, 72px)",
  },
};
