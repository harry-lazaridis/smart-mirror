import { useState, useEffect } from "react";
import { auth } from "../../firebase";

export default function CalendarSettings() {
  const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [uploadedEvents, setUploadedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setConnected(false);
          return;
        }

        const token = await currentUser.getIdToken();
        const res = await fetch(`${backendBaseUrl}/api/auth/google/calendar`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if(res.ok) { 
          setConnected(true); 
          setEvents(data); 
        }
        else setConnected(false);

        const uploadRes = await fetch(`${backendBaseUrl}/api/calendar/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const uploadData = await uploadRes.json();
        setUploadedEvents(uploadData);

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
    window.location.href = `${backendBaseUrl}/api/auth/google?token=${encodeURIComponent(token)}`;
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
      const res = await fetch(`${backendBaseUrl}/api/calendar/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,

      });

      if (!res.ok) throw new Error("Upload failed");

      alert("File upload successful");

      const data = await res.json();
      setEvents(prev => [...prev, ...data]);

      setFile(null);
    } catch(err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function formatDate(start){
    if(!start) return "";
    
    if(typeof start === "string") return start;

    if(start._seconds){
      return new Date(start._seconds * 1000).toLocaleString();
    }

    if(start.dateTime) return start.dateTime;
    if(start.date) return start.date;
  }

  if (loading) return <div className="settings-card"><p>Loading...</p></div>;

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
            {connected ? "● Connected" : "● Not connected"}
          </span>
        </p>

        {!connected && (
          <button onClick={connectGoogle} className="btn-primary">
            Connect Google Calendar
          </button>
        )}

        {connected && (
          <div>
            <h3>Upcoming events</h3>
            {events.length === 0 && (
              <p style={{ color: "#6b7280" }}>No upcoming events.</p>
            )}
            {[...events, ...uploadedEvents].map((event) => (
              <div key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{event.summary || event.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  {formatDate(event.start)}
                </p>
              </div>
            ))}
          </div>
        )}
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
