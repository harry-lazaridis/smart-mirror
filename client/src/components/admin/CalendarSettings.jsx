import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import { buildApiUrl } from "../../api/baseUrl";
import Loader from "../common/Loader.jsx";

const DEFAULT_LOOKAHEAD_DAYS = 3;
const MAX_LOOKAHEAD_DAYS = 30;

export default function CalendarSettings() {
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
    const checkConnection = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setConnected(false);
          return;
        }

        const token = await currentUser.getIdToken();
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const rawLookahead = Number(userSnap.data()?.calendarLookaheadDays);
        setLookaheadDays(
          Number.isFinite(rawLookahead)
            ? Math.min(Math.max(Math.floor(rawLookahead), 1), MAX_LOOKAHEAD_DAYS)
            : DEFAULT_LOOKAHEAD_DAYS
        );

        const res = await fetch(buildApiUrl("/api/auth/google/calendar"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if(res.ok) { 
          setConnected(true); 
          setEvents(data); 
          await setDoc(
            doc(db, "users", currentUser.uid),
            {
              googleCalendarEvents: Array.isArray(data) ? data : [],
              googleCalendarEventsUpdatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
        else setConnected(false);
        
        const uploadRes = await fetch(buildApiUrl("/api/calendar/events"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const uploadData = await uploadRes.json();
        setUploadedEvents(uploadRes.ok && Array.isArray(uploadData) ? uploadData : []);
      } catch (err) {
        console.error("checkConnection error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      checkConnection();
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  const connectGoogle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await currentUser.getIdToken();
    window.location.href = buildApiUrl(`/api/auth/google?token=${encodeURIComponent(token)}`);
  };

  const disconnectGoogle = async () => {
    try {
      setDisconnecting(true);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");
      const token = await currentUser.getIdToken();

      const res = await fetch(buildApiUrl("/api/auth/google/disconnect"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to disconnect Google Calendar");

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
      console.error(err);
      alert(err.message || "Failed to disconnect Google Calendar");
    } finally {
      setDisconnecting(false);
    }
  };

  function handleFileChange(e){
    const selected = e.target.files[0];
    if(!selected) return;

    if(!isValidFile(selected)){
      alert("Only .csv or .ical files are allowed");
      return;
    }

    setFile(selected);
  }

  //Function for handling draging a file over the drop box
  function handleDrag(e){
    e.preventDefault();
    e.stopPropagation();

    if(e.type === "dragenter" || e.type === "dragover"){
      setDragActive(true);
    } else if(e.type === "dragleave") {
      setDragActive(false);
    }
  }

  //Function to handle dropping a file in the box
  function handleDrop(e){
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if(!droppedFile) return;

    // Makes sure the file is the correct type.
    if(!isValidFile(droppedFile)){
      alert("Only .csv or .ical files allowed");
      return;
    }

    setFile(droppedFile);
  }

  //Helper function to check file type
  function isValidFile(file){
    const name = file.name.toLowerCase();

    return (
      name.endsWith(".csv") ||
      name.endsWith(".ical") ||
      name.endsWith(".ics") ||
      file.type === "text/csv" ||
      file.type === "text/calendar"
    );
  }



  async function handleUpload() {
    // Makes sure there is a file so we don't send empty requests
    if (!file) return;


    try{
      // For updating the ui to disable upload button
      setUploading(true);

      //Makes sure the user is logged in
      const currentUser = auth.currentUser;
      if(!currentUser) throw new Error("Not logged in");

      //Gets the users token
      const token = await currentUser.getIdToken();

      //Creates the form data
      const formData = new FormData();
      formData.append("file", file);

      // Calling the backend
      const res = await fetch(buildApiUrl("/api/calendar/upload"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,

      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      alert("File upload successful");
      setUploadedEvents(prev => [...prev, ...data]);

      setFile(null);
    } catch(err) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteEvent(eventId){
    try {
      const currentUser = auth.currentUser;
      if(!currentUser) throw new Error("Not logged in");

      const token = await currentUser.getIdToken();

      const res = await fetch(
        buildApiUrl(`/api/calendar/events/${eventId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if(!res.ok){
        throw new Error("Failed to delete event");
      }

      setUploadedEvents((prev) =>
        prev.filter((event) => event.id !==eventId)
      );
    } catch(err){
      console.error(err);
      alert("Failed to delete event");
    }
  }

  async function saveLookaheadDays() {
    try {
      setSavingLookahead(true);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");

      const safeDays = Math.min(
        Math.max(Math.floor(Number(lookaheadDays) || DEFAULT_LOOKAHEAD_DAYS), 1),
        MAX_LOOKAHEAD_DAYS
      );

      await setDoc(
        doc(db, "users", currentUser.uid),
        { calendarLookaheadDays: safeDays },
        { merge: true }
      );

      setLookaheadDays(safeDays);
    } catch (err) {
      console.error("Failed to save calendar range:", err);
      alert("Failed to save calendar range");
    } finally {
      setSavingLookahead(false);
    }
  }

  function formatDate(start){
    if(!start) return "";
    
    if(typeof start === "string") return start;

    if(start._seconds){
      return new Date(start._seconds * 1000).toLocaleString();
    }

    if(start.dateTime){
      return new Date(start.dateTime).toLocaleString();
    };
    if(start.date){
      return new Date(start.date).toLocaleDateString();
    };
  }

  function getEventDate(event) {
    const start = event.start;

    if(start?.dateTime){
      return new Date(start.dateTime);
    }

    if(start?.date){
      return new Date(start.date);
    }

    if(start?._seconds){
      return new Date(start._seconds * 1000);
    }

    if(typeof start === "string"){
      return new Date(start);
    }

    return new Date(0);
  }

  if (loading) return <div className="settings-card"><Loader label="Loading settings..." compact /></div>;

  const allEvents = [...events, ...uploadedEvents].sort(
    (a,b) => getEventDate(a) - getEventDate(b)
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
          <span style={{ color: connected ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {connected ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
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

        {allEvents.length > 0 && (
          <div>
            <h3>Upcoming events</h3>
            {allEvents.length === 0 && (
              <p style={{ color: "#6b7280" }}>No upcoming events.</p>
            )}
            {allEvents.map((event) => {
              const isUploadedEvent = uploadedEvents.some(
                (uploaded) => uploaded.id === event.id
              );
              return (
                <div key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{event.summary || event.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                      {formatDate(event.start)}
                    </p>
                  </div>
                  {isUploadedEvent && (
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      style = {{
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
                )
            })}
          </div>
        )}
      </div>

      <div className="settings-card">
        <h2>Mirror Calendar Range</h2>
        <p style={{ marginBottom: 10 }}>
          How many days ahead should be shown in the mirror calendar.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 320 }}>
          <input
            className="settings-input"
            type="number"
            min={1}
            max={MAX_LOOKAHEAD_DAYS}
            value={lookaheadDays}
            onChange={(e) => setLookaheadDays(e.target.value)}
          />
          <button className="btn-primary" onClick={saveLookaheadDays} disabled={savingLookahead}>
            {savingLookahead ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Stuff for the file upload */}
      <div style={{marginTop: 30}}>
        <h3>Upload Calendar File</h3>

        <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={()=> document.getElementById("fileInput").click()}
        style={{
          border: dragActive ? "2px solid #3b82f6" : "2px dashed #cbd5f5",
          background: dragActive ? "#eff6ff" : "#f8fafc",
          padding: 30,
          borderRadius: 12,
          textAlign: "center",
          cursor: "pointer",
          transition: "0.2s"
        }}>
          <p style={{marginBottom:10}}> Drag & drop a <strong>.csv</strong> or <strong>.ical</strong> calendar file here</p>
          <p style={{ fontSize: 12, color: "#6b7280"}}> or click to browse</p>
          <input id="fileInput" type="file" accept=".csv,.ical,.ics,text/calendar,text/csv" onChange={handleFileChange} style={{display:"none"}}/>

          {file && (<p style={{ marginTop: 15 }}> Selected: <strong>{file.name}</strong></p>)}

          <button onClick={(e) => {e.stopPropagation(); handleUpload();}} disabled={!file || uploading} className="btn-primary" style={{ marginTop: 15 }}>{uploading ? "Uploading..." : "Upload"}</button>
        </div>
      </div>

    </div>
  );
}
