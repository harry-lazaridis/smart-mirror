import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client";
import { auth, db } from "../../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { buildApiUrl } from "../../api/baseUrl";
import Loader from "../common/Loader.jsx";

const DEFAULT_LOOKAHEAD_DAYS = 3;
const MAX_LOOKAHEAD_DAYS = 30;

export default function CalendarWidget({ uid }) {
  const [googleEvents, setGoogleEvents] = useState([]);
  const [uploadedEvents, setUploadedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [lookaheadDays, setLookaheadDays] = useState(DEFAULT_LOOKAHEAD_DAYS);

  useEffect(() => {
    let unsubUserDoc = null;

    const userId = uid || auth.currentUser?.uid;
    if (userId) {
      unsubUserDoc = onSnapshot(doc(db, "users", userId), (snap) => {
        const data = snap.data() || {};
        const raw = Number(data.calendarLookaheadDays);
        setLookaheadDays(
          Number.isFinite(raw)
            ? Math.min(Math.max(Math.floor(raw), 1), MAX_LOOKAHEAD_DAYS)
            : DEFAULT_LOOKAHEAD_DAYS
        );
        if (Array.isArray(data.events)) setUploadedEvents(data.events);
        if (Array.isArray(data.googleCalendarEvents)) setGoogleEvents(data.googleCalendarEvents);
        setLoading(false);
      });
    }

    const checkConnection = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setNeedsReconnect(false);
          setLoading(false);
          return;
        }

        const token = await currentUser.getIdToken();
        const [googleRes, uploadedRes] = await Promise.allSettled([
          api.get("/auth/google/calendar", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/calendar/events", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const userSnap = await fetchLookaheadDays(currentUser.uid);
        setLookaheadDays(userSnap);

        if (googleRes.status === "fulfilled") {
          setGoogleEvents(Array.isArray(googleRes.value.data) ? googleRes.value.data : []);
          setNeedsReconnect(false);
        } else {
          const reconnectCode = googleRes.reason?.response?.data?.code;
          setNeedsReconnect(reconnectCode === "GOOGLE_RECONNECT_REQUIRED");
          setGoogleEvents([]);
        }

        if (uploadedRes.status === "fulfilled") {
          setUploadedEvents(Array.isArray(uploadedRes.value.data) ? uploadedRes.value.data : []);
        } else {
          setUploadedEvents([]);
        }
      } catch (err) {
        const reconnectCode = err?.response?.data?.code;
        setNeedsReconnect(reconnectCode === "GOOGLE_RECONNECT_REQUIRED");
        setGoogleEvents([]);
        setUploadedEvents([]);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      checkConnection();
      window.history.replaceState({}, "", "/admin"); //Fråga inte varför
    }

    return () => {
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [uid]);

  const filteredEvents = useMemo(() => {
    const merged = [...googleEvents, ...uploadedEvents].map((event, index) => ({
      ...event,
      _safeId: event?.id ? String(event.id) : `evt-${index}`,
      _date: getEventDate(event),
    }));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now);
    end.setDate(end.getDate() + lookaheadDays);

    const datedEvents = merged
      .filter((event) => event._date && !Number.isNaN(event._date.getTime()))
      .filter((event) => {
        const lowerBound = isAllDayEvent(event) ? startOfToday : now;
        return event._date >= lowerBound && event._date <= end;
      })
      .sort((a, b) => a._date - b._date);

    const undatedEvents = merged.filter((event) => !event._date || Number.isNaN(event._date.getTime()));
    return [...datedEvents, ...undatedEvents];
  }, [googleEvents, uploadedEvents, lookaheadDays]);

  const reconnectGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await currentUser.getIdToken();
    window.location.href = buildApiUrl(`/api/auth/google?token=${encodeURIComponent(token)}`);
  };

  if (loading) return <div style={styles.card}><Loader label="Loading calendar..." dark compact /></div>;
  if (needsReconnect) {
    return (
      <div style={styles.card}>
        <p>Google Calendar needs to be reconnected.</p>
        <button style={styles.button} onClick={reconnectGoogle}>Reconnect Google</button>
      </div>
    );
  }

  return (
        <div style={styles.card}>
          <h3 style={styles.heading}>Upcoming events ({lookaheadDays} days)</h3>
          {filteredEvents.length === 0 && <p>No events in this period</p>}
          {filteredEvents.map((event) => (
            <div key={event._safeId} style={styles.event}>
              <strong>{getEventTitle(event)}</strong>

              <div style={styles.dateTimeRow}>
                <span style={styles.date}>{formatEventDate(event)}</span>
                <span style={styles.time}>{formatEventTime(event)}</span>
              </div>
            </div>
          ))}
        </div> 
  );
}

async function fetchLookaheadDays(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const raw = Number(snap.data()?.calendarLookaheadDays);
  if (!Number.isFinite(raw)) return DEFAULT_LOOKAHEAD_DAYS;
  return Math.min(Math.max(Math.floor(raw), 1), MAX_LOOKAHEAD_DAYS);
}

function getEventDate(event) {
  return getEventStart(event);
}

function getEventStart(event) {
  const start = event?.start ?? event?.startDate ?? event?.date ?? event?.when ?? event?.datetime ?? event?.["Start Date"] ?? event?.["Start"] ?? event?.["Date"];

  if (typeof start?.toDate === "function") return start.toDate();
  if (start?.dateTime) return new Date(start.dateTime);
  if (start?.date) return new Date(start.date);
  if (typeof start?.seconds === "number") return new Date(start.seconds * 1000);
  if (start?._seconds) return new Date(start._seconds * 1000);
  if (start instanceof Date) return start;
  if (typeof start === "string") return new Date(start);

  return null;
}

function formatEventDate(event) {
  const date = getEventStart(event);
  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatEventTime(event) {
  if (isAllDayEvent(event)) return "All day";

  const date = getEventStart(event);
  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getEventTitle(event) {
  return (
    event?.summary ||
    event?.title ||
    event?.name ||
    event?.description ||
    "Untitled event"
  );
}

function isAllDayEvent(event) {
  return Boolean(event?.start?.date) && !event?.start?.dateTime;
}

const styles = {
  card: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    padding: "6cqi",
    color: "white",
    fontSize: "clamp(11px, 4.5cqi, 18px)",
  },
  heading: {
    margin: "0 0 4cqi",
    fontSize: "clamp(12px, 6cqi, 24px)",
  },
  button: {
    marginTop: 10,
    padding: "2cqi 3cqi",
    cursor: "pointer",
    background: "#4285f4",
    color: "white",
    border: "none",
    borderRadius: "1.8cqi",
  },
  event: {
    padding: "2.6cqi 0",
    borderBottom: "1px solid #334155",
  },
  dateTimeRow: {
    marginTop: "1.2cqi",
    display: "flex",
    gap: "2cqi",
    alignItems: "center",
  },
  date: {
    opacity: 1,
    fontWeight: 700,
    fontSize: "clamp(10px, 4cqi, 16px)",
  },
  time: {
    fontWeight: 700,
    fontSize: "clamp(11px, 4.5cqi, 18px)",
  },
};
