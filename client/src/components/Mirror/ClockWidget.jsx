import React, { useState, useEffect, useRef } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());
  const canvasRef = useRef(null);

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={styles.box}>
      <div style={styles.top}>
        <div style={styles.analogclock}> <canvas ref={canvasRef}width={160} height={160}></canvas> </div>
        <div style={styles.digitaltime}>{time.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false})}</div>
      </div>
      <div style={styles.bottom}>{time.toLocaleDateString("en-GB", {weekday: "long", month: "long", day: "numeric"})}</div>
      
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
  box: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    flexDirection: "column",
  },

  top: {
    display: "flex",
    alignItems: "center",
    gap: "30px"

  },

  digitaltime: {
    fontFamily: "Inter",
    fontSize: "80px",
  },

  analogclock: {
    height: "160px",
    width: "160px",
  },

  bottom: {
    fontSize: "50px",
    fontFamily: "Inter",


  },
};

function clock () {
  ctx.arc(0, 0, radius, 0 , 2 * Math.PI);
  ctx.fillStyle = "white";
  ctx.fill();

}