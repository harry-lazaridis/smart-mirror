import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { api } from "../../api/client";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNotifier } from "../../notifications/NotificationProvider";

export default function NewsWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const notifier = useNotifier();

  useEffect(() => {
    let unsub = null;

    const loadNewsForUser = async (uid) => {
      unsub = onSnapshot(doc(db, "users", uid), async (snap) => {
        try {
          const newsSettings = snap.data()?.newsSettings ?? {
            sources: ["svt", "sr_ekot"],
            limit: 8,
          };

          const sources = Array.isArray(newsSettings.sources)
            ? newsSettings.sources
            : ["svt", "sr_ekot"];

          const limit = Number(newsSettings.limit) || 8;

          const res = await api.get("/api/util/news", {
            params: {
              sources: sources.join(","),
              limit,
            },
          });

          setItems(Array.isArray(res.data) ? res.data : []);
          notifier?.reportApiStatus("news", "success");
        } catch (err) {
          console.error("Failed to load news:", err);

          // Keep old headlines if API fails.
          notifier?.reportApiStatus("news", "error");
        } finally {
          setLoading(false);
        }
      });
    };

    const init = async () => {
      const authUid = auth.currentUser?.uid;

      if (authUid) {
        await loadNewsForUser(authUid);
        return;
      }

      const deviceId = localStorage.getItem("deviceId");

      if (!deviceId) {
        setLoading(false);
        notifier?.reportApiStatus("news", "error");
        return;
      }

      const deviceSnap = await getDoc(doc(db, "devices", deviceId));
      const uidFromDevice = deviceSnap.data()?.uid;

      if (!uidFromDevice) {
        setLoading(false);
        notifier?.reportApiStatus("news", "error");
        return;
      }

      await loadNewsForUser(uidFromDevice);
    };

    // Refresh immediately on page load
    init();

    // Refresh every 1 hour
    const interval = setInterval(() => {
      init();
    }, 60 * 60 * 1000);

    return () => {
      if (unsub) unsub();
      clearInterval(interval);
    };
  }, [notifier]);

  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>News</h3>

      {loading && <p style={styles.text}>Loading headlines...</p>}

      {!loading && items.length === 0 && (
        <p style={styles.text}>No headlines available.</p>
      )}

      {!loading && items.length > 0 && (
        <div style={styles.list}>
          {items.map((item, index) => (
            <div key={`${item.link}-${index}`} style={styles.item}>
              <p style={styles.itemTitle}>{item.title}</p>
              <p style={styles.itemMeta}>{item.sourceName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    width: "100%",
    height: "100%",
    color: "white",
    display: "flex",
    flexDirection: "column",
    padding: "8cqi",
    gap: "2cqi",
    overflowY: "auto",
  },

  title: {
    margin: 0,
    fontSize: "clamp(14px, 8cqi, 32px)",
    lineHeight: 1.1,
  },

  text: {
    margin: 0,
    opacity: 0.8,
    fontSize: "clamp(11px, 4.5cqi, 18px)",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5cqi",
  },

  item: {
    borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
    paddingBottom: "2cqi",
  },

  itemTitle: {
    margin: 0,
    fontSize: "clamp(11px, 4.5cqi, 18px)",
    lineHeight: 1.25,
  },

  itemMeta: {
    margin: "1cqi 0 0",
    opacity: 0.7,
    fontSize: "clamp(9px, 3.6cqi, 14px)",
  },
};