import React, { useState, useEffect } from "react";

const quoteTypes = [
    "Motivational",
    "Positive Thinking",
    "Wisdom",
    "Inspirational",
    "Humorous",
    "Mindfulness",


];

export default function QuoteSettings(){
    const [activeQuotes, setActiveQuotes] = useState({
        "Motivational": true,
        "Positive Thinking": true,
         "Wisdom": true,
         "Inspirational": true,
         "Humorous": true,
         "Mindfulness": true,
    });

    return(
        <div>
             <div className="page-header">
            <h1>Quotes</h1>
            <p>Choose the type of qoutes to show in the mirror quotes widget.</p>
             </div>

             <div className="quotes-grid">
                {quoteTypes.map((type) => {
                const active = activeQuotes[type];

                return(
                <div className="quotes-card" key={type}>
                    <div className="quotes-top">
                    <span className="quotes-title">{type}</span>
                 <button

                 onClick={() =>
                    setActiveQuotes((prev)=> ({ ...prev, [type]: !prev[type],
                    }))
                 }
                  style={{
                    width: 48, height: 26, borderRadius: 999,
                    background: active ? "#2563eb" : "#d1d5db",
                    border: "none", cursor: "pointer",
                    position: "relative", flexShrink: 0,
                    transition: "background 0.2s",
                    padding: 0,
                  }}
                >
                  <span style={{
                    position: "absolute",
                    top: 3, left: active ? 25 : 3,
                    width: 20, height: 20,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                    //boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </button>
                    </div>
                </div>

                )})}
            </div>

               
        </div>

    );

}