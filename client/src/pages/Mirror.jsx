import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import WeatherWidget from "../components/Mirror/WeatherWidget";
import SLWidget from "../components/Mirror/SLWidget";
import CalendarWidget from "../components/Mirror/CalendarWidget";
import ClockWidget from "../components/Mirror/ClockWidget";
import NewsWidget from "../components/Mirror/NewsWidget";
import TodoWidget from "../components/Mirror/TodoWidget";
import QuotesWidget from "../components/Mirror/QuotesWidget";
import { onAuthStateChanged } from "firebase/auth";
import Loader from "../components/common/Loader.jsx";

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
    return <div style={{ color: "white", padding: 20 }}><Loader label="Loading mirror..." dark /></div>;
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
              <div style={styles.widgetInner}>{renderWidget(p.id, uid)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function renderWidget(id, uid) {
  switch (id) {
    case "clock":
      return <ClockWidget />;
    case "weather":
      return <WeatherWidget />;
    case "news":
      return <NewsWidget />;
    case "calendar":
      return <CalendarWidget uid={uid} />;
    case "sl":
      return <SLWidget uid={uid} />;
    case "todo":
      return <TodoWidget />;
    case "quotes":
      return <QuotesWidget />;
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
    background: "rgba(0, 0, 0, 0.55)",
    border: "1px solid rgba(0, 0, 0, 0.25)",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    containerType: "size",
    backdropFilter: "blur(2px)",
  },
  widgetInner: {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    display: "flex",
  },
};
