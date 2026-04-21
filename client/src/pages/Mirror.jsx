import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import WeatherWidget from "../components/Mirror/WeatherWidget";
import SLWidget from "../components/Mirror/SLWidget";
import CalendarWidget from "../components/Mirror/CalendarWidget";
import ClockWidget from "../components/Mirror/ClockWidget";
import NewsWidget from "../components/Mirror/NewsWidget";
import { onAuthStateChanged } from "firebase/auth";

//Radera när vi deploy.
const isDevMode = () => localStorage.getItem("devMode") === "true";

export default function Mirror() {
  const [uid, setUid] = useState(null);
  const [layout, setLayout] = useState(null);
  const [status, setStatus] = useState("loading")
  const navigate = useNavigate();

  const canvasRef = useRef(null);

  useEffect(() => {
    let userUnsub = null;

    const setupUserListener = (uid) => {
      if (userUnsub) userUnsub();

      userUnsub = onSnapshot(doc(db, "users", uid), (snap) => {
        const widgetLayout = snap.data()?.widgetLayout;
        if (widgetLayout) setLayout(widgetLayout);
        setStatus("ready");
      });
    };

    if (isDevMode()) {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (!user) { setStatus("unlinked"); return; }
        setUid(user.uid);
        setupUserListener(user.uid);
      });
      return () => { unsub(); if (userUnsub) userUnsub(); };
    }

    // Production
    const deviceId = localStorage.getItem("deviceId");
    if (!deviceId) { navigate("/sync"); return; }

    const deviceUnsub = onSnapshot(doc(db, "devices", deviceId), (snap) => {
      const data = snap.data();
      if (!data?.uid) { navigate("/sync"); return; }
      setUid(data.uid);
      setupUserListener(data.uid);
    });

    return () => { deviceUnsub(); if (userUnsub) userUnsub(); };
  }, []);

  if (!layout) {
    return <p style={{ color: "white", padding: 20 }}>Loading...</p>;
  }

  const { mirrorW, mirrorH, placed } = layout;

  return (
    <div style={styles.page}>
      <div
        ref={canvasRef}
        style={{
          ...styles.canvas,
          aspectRatio: `${mirrorW} / ${mirrorH}`,
        }}
      >
        {placed.map((p) => {
          const scaleX = 100 / mirrorW;
          const scaleY = 100 / mirrorH;

          return (
            <div
              key={p.id}
              style={{
                ...styles.widget,
                left: `${p.x * scaleX}%`,
                top: `${p.y * scaleY}%`,
                width: `${p.w * scaleX}%`,
                height: `${p.h * scaleY}%`,
              }}
            >
              {renderWidget(p.id)}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function renderWidget(id) {
  switch (id) {
    case "clock":
      return <ClockWidget />;
    case "weather":
      return <WeatherWidget />;
    case "news":
      return <NewsWidget />;
    case "calendar":
      return <CalendarWidget />;
    case "sl":
      return <SLWidget />;
    default:
      return <div>Unknown</div>;
  }
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