import React, { useState, useEffect } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={styles.center}>
      <h2>{time.toLocaleTimeString()}</h2>
      <h1>Hej aldina</h1>
    </div>
  );
}

const styles = {
  page: {
    width: "100vw",
    height: "100vh",
    background: "black",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    position: "relative",
    width: "100%",
    height: "100%",
    maxWidth: "100vw",
    maxHeight: "100vh",
    background: "#00000", //#020617
    overflow: "hidden",
  },
  widget: {
    position: "absolute",
    background: "#000000", //#0c1e35
    borderRadius: 6,
    overflow: "hidden",
    display: "flex",
    outlineColor: "#FFF",
    outlineStyle: "solid"
    
  },
  center: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },
};