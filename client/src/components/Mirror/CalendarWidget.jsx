import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../api/client";
import { auth, db } from "../../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNotifier } from "../../notifications/NotificationProvider";

const DEFAULT_LOOKAHEAD_DAYS = 3;
const MAX_LOOKAHEAD_DAYS = 30;

export default function CalendarWidget({ uid }) {
  const [googleEvents, setGoogleEvents] = useState([]);
  const [uploadedEvents, setUploadedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [lookaheadDays, setLookaheadDays] = useState(DEFAULT_LOOKAHEAD_DAYS);
  const notifier = useNotifier();

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

        // Uploaded CSV/iCal events can still come from Firestore.
        if (Array.isArray(data.events)) setUploadedEvents(data.events);

        // Do NOT load Google events from Firestore here.
        // Google events should only come from the Google Calendar API.

        setLoading(false);
      });
    }

    const checkConnection = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          setNeedsReconnect(false);
          setLoading(false);
          notifier?.reportApiStatus("calendar", "success");
          return;
        }

        const token = await currentUser.getIdToken();

        const [googleRes, uploadedRes] = await Promise.allSettled([
          api.get("/api/auth/google/calendar", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/calendar/events", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const userSnap = await fetchLookaheadDays(currentUser.uid);
        setLookaheadDays(userSnap);

        // Successful Google API response replaces Google events,
        // even if the returned array is empty.
        // Failed API response keeps old visible events.
        if (googleRes.status === "fulfilled") {
          if (Array.isArray(googleRes.value.data)) {
            setGoogleEvents(googleRes.value.data);
          }

          setNeedsReconnect(false);
        } else {
          const reconnectCode = googleRes.reason?.response?.data?.code;
          setNeedsReconnect(reconnectCode === "GOOGLE_RECONNECT_REQUIRED");
        }

        // Successful uploaded CSV/iCal API response replaces uploaded events,
        // even if the returned array is empty.
        // Failed API response keeps old visible events.
        if (uploadedRes.status === "fulfilled") {
          if (Array.isArray(uploadedRes.value.data)) {
            setUploadedEvents(uploadedRes.value.data);
          }
        }

        if (googleRes.status === "fulfilled" || uploadedRes.status === "fulfilled") {
          notifier?.reportApiStatus("calendar", "success");
        } else {
          notifier?.reportApiStatus("calendar", "error");
        }
      } catch (err) {
        const reconnectCode = err?.response?.data?.code;
        setNeedsReconnect(reconnectCode === "GOOGLE_RECONNECT_REQUIRED");

        // Do not clear events here. Failed refresh should keep old visible events.
        notifier?.reportApiStatus("calendar", "error");
      } finally {
        setLoading(false);
      }
    };

    // Refresh once when the mirror page loads.
    checkConnection();

    // Then refresh every 15 minutes.
    const interval = setInterval(() => {
      checkConnection();
    }, 15 * 60 * 1000);

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      checkConnection();
      window.history.replaceState({}, "", "/admin"); //Fråga inte varför
    }

    return () => {
      clearInterval(interval);
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [uid, notifier]);

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

    const undatedEvents = merged.filter(
      (event) => !event._date || Number.isNaN(event._date.getTime())
    );

    return [...datedEvents, ...undatedEvents];
  }, [googleEvents, uploadedEvents, lookaheadDays]);

  useEffect(() => {
    const checkReminders = () => {
      filteredEvents.forEach((event) => {
        if (!event._date || Number.isNaN(event._date.getTime()) || isAllDayEvent(event)) return;

        const minutes = Math.round((event._date.getTime() - Date.now()) / 60000);
        const title = getEventTitle(event);

        [60, 15].forEach((target) => {
          const eventTimeKey = event._date.toISOString();
          const key = `calendar-reminder-${event._safeId}-${eventTimeKey}-${target}`;

          if (minutes <= target && minutes > target - 2 && !localStorage.getItem(key)) {
            notifier?.notify({
              text: `Reminder. ${title} starts in ${
                target === 60 ? "one hour" : "fifteen minutes"
              }.`,
              voice: true,
            });

            localStorage.setItem(key, "true");
          }
        });
      });
    };

    checkReminders();

    // Reminder checks every 60 seconds.
    const interval = setInterval(checkReminders, 60 * 1000);

    return () => clearInterval(interval);
  }, [filteredEvents, notifier]);

  const reconnectGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await currentUser.getIdToken();
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    window.location.href = `${baseURL}/api/auth/google?token=${encodeURIComponent(token)}`;
  };

  if (loading) return <div style={styles.card}>Loading...</div>;

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
  const start =
    event?.start ??
    event?.startDate ??
    event?.date ??
    event?.when ??
    event?.datetime ??
    event?.["Start Date"] ??
    event?.["Start"] ??
    event?.["Date"];

  if (typeof start?.toDate === "function") return start.toDate();
  if (start?.dateTime) return new Date(start.dateTime);
  if (start?.date) return new Date(start.date);
  if (typeof start?.seconds === "number") return new Date(start.seconds * 1000);
  if (start?._seconds) return new Date(start._seconds * 1000);
  if (typeof start === "string") return new Date(start);
  if (start instanceof Date) return start;

  return null;
}

function formatEventDate(event) {
  const date = getEventDate(event);

  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatEventTime(event) {
  if (isAllDayEvent(event)) return "All day";

  const date = getEventDate(event);

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
    fontWeight: 600,
    fontSize: "clamp(10px, 4cqi, 16px)",
  },
  time: {
    fontWeight: 700,
    fontSize: "clamp(11px, 4.5cqi, 18px)",
  },
};