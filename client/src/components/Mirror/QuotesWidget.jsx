import React, { useState, useEffect } from "react";

const quotes = [
    "Life is about making an impact, not making an income. – Kevin Kruse",
    "Whatever the mind of man can conceive and believe, it can achieve. – Napoleon Hill",
    "Strive not to be a success, but rather to be of value. – Albert Einstein",

];

export default function QuotesWidget() {

  const [quote, setQuote] = useState(() => quotes [Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    const i = setInterval(() => setQuote(quotes [Math.floor(Math.random() * quotes.length)]), 10000);

    return () => clearInterval(i);
  }, []);

  return (
    <div style={styles.center}>
      <p style={styles.label}>{quote}</p>
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
    fontFamily: "Century Gothic" ,
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
