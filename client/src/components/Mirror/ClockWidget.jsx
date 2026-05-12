import React, { useState, useEffect } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const formatDate = (date) => {
    const day = date.getDate();

    const getOrdinal = (n) => {
      if (n > 3 && n < 21) return "th";

      switch (n % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();

    return `${day}${getOrdinal(day)} ${month}, ${year}`;
  };

  return (
    <div style={styles.center}>
      <p style={styles.label}>Time</p>

      <h1 style={styles.time}>
        {time.toLocaleTimeString("sv-SE", {
          hour12: false,
        })}
      </h1>

      <p style={styles.date}>
        {formatDate(time)}
      </p>

      <p style={styles.weekday}>
        {time.toLocaleDateString("en-US", {
          weekday: "long",
        })}
      </p>
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
  date: {
  margin: 0,
  marginTop: "2cqi",
  lineHeight: 1.1,
  opacity: 1,
  fontSize: "clamp(10px, 5cqi, 22px)",
},

weekday: {
  margin: 0,
  lineHeight: 1.1,
  opacity: 1,
  fontSize: "clamp(10px, 5cqi, 18px)",
  letterSpacing: "0.05em",
},
};