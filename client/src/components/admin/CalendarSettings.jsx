import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

const DEFAULT_LOOKAHEAD_DAYS = 3;
const MAX_LOOKAHEAD_DAYS = 30;

async function readResponseSafely(res) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (err) {
      throw new Error(
        [
          "Backend returned invalid JSON.",
          `HTTP status: ${res.status}`,
          `Content-Type: ${contentType}`,
          "",
          "Raw response:",
          rawText.slice(0, 1500),
        ].join("\n")
      );
    }
  } else {
    data = {
      error:
        rawText ||
        `Backend returned a non-JSON response. HTTP status: ${res.status}`,
      raw: rawText,
    };
  }

  if (!res.ok) {
    throw new Error(
      data?.error ||
        [
          "Request failed.",
          `HTTP status: ${res.status}`,
          `Content-Type: ${contentType}`,
          "",
          "Raw response:",
          rawText.slice(0, 1500),
        ].join("\n")
    );
  }

  return data;
}

function normalizeEventsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.events)) return data.events;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.calendarEvents)) return data.calendarEvents;
  if (Array.isArray(data?.uploadedEvents)) return data.uploadedEvents;
  return [];
}

export default function CalendarSettings() {
  const backendBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [uploadedEvents, setUploadedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lookaheadDays, setLookaheadDays] = useState(DEFAULT_LOOKAHEAD_DAYS);
  const [savingLookahead, setSavingLookahead] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          if (!cancelled) {
            setConnected(false);
            setEvents([]);
            setUploadedEvents([]);
          }
          return;
        }

        const token = await currentUser.getIdToken();

        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const rawLookahead = Number(userSnap.data()?.calendarLookaheadDays);

        if (!cancelled) {
          setLookaheadDays(
            Number.isFinite(rawLookahead)
              ? Math.min(
                  Math.max(Math.floor(rawLookahead), 1),
                  MAX_LOOKAHEAD_DAYS
                )
              : DEFAULT_LOOKAHEAD_DAYS
          );
        }

        const googleCalendarRes = await fetch(
          `${backendBaseUrl}/api/auth/google/calendar`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let googleCalendarData = [];

        try {
          googleCalendarData = await readResponseSafely(googleCalendarRes);
        } catch (err) {
          console.warn("Google Calendar fetch failed:", err);
          googleCalendarData = [];
        }

        if (!cancelled) {
          if (googleCalendarRes.ok) {
            const normalizedGoogleEvents =
              normalizeEventsResponse(googleCalendarData);

            setConnected(true);
            setEvents(normalizedGoogleEvents);

            await setDoc(
              doc(db, "users", currentUser.uid),
              {
                googleCalendarEvents: normalizedGoogleEvents,
                googleCalendarEventsUpdatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } else {
            setConnected(false);
            setEvents([]);
          }
        }

        const uploadedEventsRes = await fetch(
          `${backendBaseUrl}/api/calendar/events`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let uploadedEventsData = [];

        try {
          uploadedEventsData = await readResponseSafely(uploadedEventsRes);
        } catch (err) {
          console.warn("Uploaded calendar events fetch failed:", err);
          uploadedEventsData = [];
        }

        if (!cancelled) {
          setUploadedEvents(
            uploadedEventsRes.ok
              ? normalizeEventsResponse(uploadedEventsData)
              : []
          );
        }
      } catch (err) {
        console.error("checkConnection error:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkConnection();

    const params = new URLSearchParams(window.location.search);

    if (params.get("calendar") === "connected") {
      checkConnection();
      window.history.replaceState({}, "", "/admin");
    }

    return () => {
      cancelled = true;
    };
  }, [backendBaseUrl]);

  const connectGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await currentUser.getIdToken();
    window.location.href = `${backendBaseUrl}/api/auth/google?token=${encodeURIComponent(
      token
    )}`;
  };

  const disconnectGoogle = async () => {
    try {
      setDisconnecting(true);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");

      const token = await currentUser.getIdToken();

      const res = await fetch(`${backendBaseUrl}/api/auth/google/disconnect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      await readResponseSafely(res);

      setConnected(false);
      setEvents([]);

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          googleCalendarEvents: [],
          googleCalendarEventsUpdatedAt: null,
        },
        { merge: true }
      );
    } catch (err) {
      console.error("disconnectGoogle error:", err);
      alert(err.message || "Failed to disconnect Google Calendar");
    } finally {
      setDisconnecting(false);
    }
  };

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!isValidFile(selected)) {
      alert("Only .csv, .ics, or .ical files are allowed");
      e.target.value = "";
      return;
    }

    setFile(selected);
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!isValidFile(droppedFile)) {
      alert("Only .csv, .ics, or .ical files are allowed");
      return;
    }

    setFile(droppedFile);
  }

  function isValidFile(candidateFile) {
    const name = candidateFile.name.toLowerCase();

    return (
      name.endsWith(".csv") ||
      name.endsWith(".ical") ||
      name.endsWith(".ics") ||
      candidateFile.type === "text/csv" ||
      candidateFile.type === "text/calendar"
    );
  }

  async function handleUpload() {
    if (!file) return;

    try {
      setUploading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");

      const token = await currentUser.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${backendBaseUrl}/api/calendar/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await readResponseSafely(res);
      const parsedEvents = normalizeEventsResponse(data);

      if (!parsedEvents.length) {
        console.warn("Upload succeeded but no events array was found:", data);
      }

      setUploadedEvents((prev) => [...prev, ...parsedEvents]);
      setFile(null);

      const fileInput = document.getElementById("fileInput");
      if (fileInput) fileInput.value = "";

      alert("File upload successful");
    } catch (err) {
      console.error("Calendar upload failed:", err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteEvent(eventId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");

      const token = await currentUser.getIdToken();

      const res = await fetch(
        `${backendBaseUrl}/api/calendar/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await readResponseSafely(res);

      setUploadedEvents((prev) =>
        prev.filter((event) => event.id !== eventId)
      );
    } catch (err) {
      console.error("handleDeleteEvent error:", err);
      alert(err.message || "Failed to delete event");
    }
  }

  async function saveLookaheadDays() {
    try {
      setSavingLookahead(true);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");

      const safeDays = Math.min(
        Math.max(
          Math.floor(Number(lookaheadDays) || DEFAULT_LOOKAHEAD_DAYS),
          1
        ),
        MAX_LOOKAHEAD_DAYS
      );

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          calendarLookaheadDays: safeDays,
        },
        { merge: true }
      );

      setLookaheadDays(safeDays);
    } catch (err) {
      console.error("Failed to save calendar range:", err);
      alert(err.message || "Failed to save calendar range");
    } finally {
      setSavingLookahead(false);
    }
  }

  function formatDate(start) {
    if (!start) return "";

    if (typeof start === "string") {
      const parsed = new Date(start);
      return Number.isNaN(parsed.getTime())
        ? start
        : parsed.toLocaleString();
    }

    if (start._seconds) {
      return new Date(start._seconds * 1000).toLocaleString();
    }

    if (start.seconds) {
      return new Date(start.seconds * 1000).toLocaleString();
    }

    if (start.dateTime) {
      return new Date(start.dateTime).toLocaleString();
    }

    if (start.date) {
      return new Date(start.date).toLocaleDateString();
    }

    return "";
  }

  function getEventDate(event) {
    const start = event.start || event.startTime || event.date;

    if (start?.dateTime) {
      return new Date(start.dateTime);
    }

    if (start?.date) {
      return new Date(start.date);
    }

    if (start?._seconds) {
      return new Date(start._seconds * 1000);
    }

    if (start?.seconds) {
      return new Date(start.seconds * 1000);
    }

    if (typeof start === "string") {
      const parsed = new Date(start);
      return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    }

    return new Date(0);
  }

  function getEventTitle(event) {
    return event.summary || event.title || event.name || "Untitled event";
  }

  if (loading) {
    return (
      <div className="settings-card">
        <p>Loading...</p>
      </div>
    );
  }

  const allEvents = [...events, ...uploadedEvents].sort(
    (a, b) => getEventDate(a) - getEventDate(b)
  );

  return (
    <div>
      <div className="page-header">
        <h1>Calendar</h1>
        <p>Connect your Google Calendar to display events on the mirror.</p>
      </div>

      <div className="settings-card">
        <h2>Google Calendar</h2>

        <p style={{ marginBottom: 16 }}>
          Status:{" "}
          <span
            style={{
              color: connected ? "#16a34a" : "#dc2626",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {connected ? (
                <FiCheckCircle size={14} />
              ) : (
                <FiXCircle size={14} />
              )}
              {connected ? "Connected" : "Not connected"}
            </span>
          </span>
        </p>

        {!connected && (
          <button onClick={connectGoogle} className="btn-primary">
            Connect Google Calendar
          </button>
        )}

        {connected && (
          <button
            onClick={disconnectGoogle}
            className="btn-danger"
            disabled={disconnecting}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect Google Calendar"}
          </button>
        )}

        <div>
          <h3>Upcoming events</h3>

          {allEvents.length === 0 && (
            <p style={{ color: "#6b7280" }}>No upcoming events.</p>
          )}

          {allEvents.map((event, index) => {
            const eventId =
              event.id ||
              event.uid ||
              event.eventId ||
              `${getEventTitle(event)}-${formatDate(event.start)}-${index}`;

            const isUploadedEvent = uploadedEvents.some((uploaded) => {
              const uploadedId = uploaded.id || uploaded.uid || uploaded.eventId;
              return uploadedId && uploadedId === eventId;
            });

            return (
              <div
                key={eventId}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {getEventTitle(event)}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    {formatDate(event.start || event.startTime || event.date)}
                  </p>
                </div>

                {isUploadedEvent && (
                  <button
                    onClick={() => handleDeleteEvent(eventId)}
                    style={{
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-card">
        <h2>Mirror Calendar Range</h2>
        <p style={{ marginBottom: 10 }}>
          How many days ahead should be shown in the mirror calendar.
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            maxWidth: 320,
          }}
        >
          <input
            className="settings-input"
            type="number"
            min={1}
            max={MAX_LOOKAHEAD_DAYS}
            value={lookaheadDays}
            onChange={(e) => setLookaheadDays(e.target.value)}
          />

          <button
            className="btn-primary"
            onClick={saveLookaheadDays}
            disabled={savingLookahead}
          >
            {savingLookahead ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Upload Calendar File</h3>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput")?.click()}
          style={{
            border: dragActive ? "2px solid #3b82f6" : "2px dashed #cbd5f5",
            background: dragActive ? "#eff6ff" : "#f8fafc",
            padding: 30,
            borderRadius: 12,
            textAlign: "center",
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          <p style={{ marginBottom: 10 }}>
            Drag & drop a <strong>.csv</strong>, <strong>.ics</strong>, or{" "}
            <strong>.ical</strong> calendar file here
          </p>

          <p style={{ fontSize: 12, color: "#6b7280" }}>or click to browse</p>

          <input
            id="fileInput"
            type="file"
            accept=".csv,.ical,.ics,text/calendar,text/csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {file && (
            <p style={{ marginTop: 15 }}>
              Selected: <strong>{file.name}</strong>
            </p>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={!file || uploading}
            className="btn-primary"
            style={{ marginTop: 15 }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
