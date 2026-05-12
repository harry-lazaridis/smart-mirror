import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const quotes = {

  "Motivational": [
    "Life is about making an impact, not making an income. – Kevin Kruse",
    "Testar fler",
  ],

  "Positive Thinking": [
    "Every day may not be good, but there is something good in every day.",

  ],

  "Wisdom": [

    "Strive not to be a success, but rather to be of value. – Albert Einstein",

  ],

  "Inspirational": [
    "Whatever the mind of man can conceive and believe, it can achieve. – Napoleon Hill",
  ],

  "Humorous": [
    "Life is short. Smile while you still have teeth."
  ],

  "Mindfulness": [
    "Peace begins with a deep breath.",
  ],

};

function getQuote(activeQuoteTypes){

  const toggledQuoteType = [];

  Object.keys(activeQuoteTypes).forEach((type) => {
    if (activeQuoteTypes[type]=== true) {
      toggledQuoteType.push(...quotes[type]);
    }
  });

  if (toggledQuoteType.length === 0){
    return "You need to choose categorys in Quotes settings.";
  }

  else {
    return toggledQuoteType [Math.floor(Math.random() * toggledQuoteType.length)];
  }
}

export default function QuotesWidget() {

  const [activatedQuotes, setActivatedQuotes] = useState({
    "Motivational": true,
    "Positive Thinking": true,
     "Wisdom": true,
     "Inspirational": true,
     "Humorous": true,
     "Mindfulness": true,
  });



  const [quote, setQuote] = useState(" ");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const stop = onSnapshot(doc(db, "users", uid), (snap) => {
      const data = snap.data()?.quoteSettings?.activeQuoteTypes;

      if (data){
        setActivatedQuotes(data);
        setQuote(getQuote(data));
      }
      else{
        setQuote(getQuote(activatedQuotes));
      }

    });

    return () => stop();
  }, []);


  useEffect(() => {
    setQuote(getQuote(activatedQuotes));

    const i = setInterval(() => setQuote(getQuote(activatedQuotes)), 10000);

    return () => clearInterval(i); }, [activatedQuotes]
  );

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
