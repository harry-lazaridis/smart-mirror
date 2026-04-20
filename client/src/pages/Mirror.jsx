import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import WeatherWidget from "../components/Mirror/WeatherWidget";
import SLWidget from "../components/Mirror/SLWidget";
import CalendarWidget from "../components/Mirror/CalendarWidget";
import ClockWidget from "../components/Mirror/ClockWidget";
import NewsWidget from "../components/Mirror/NewsWidget";

export default function Mirror() {
  const [layout, setLayout] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
      const data = snap.data()?.widgetLayout;
      if (data) { setLayout(data); }
    });
    
    return () => unsubscribe();
  }, []);

/*
  useEffect(() => {
    const load = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data()?.widgetLayout;

      if (data) {
        setLayout(data);
      }
    };

    load();
  }, []);
*/
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