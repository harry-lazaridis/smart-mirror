import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { FiCheck } from "react-icons/fi";

//Default settings used if the user has not saved any custom SL settings yet
const DEFAULT_SETTINGS = {
  timewindow: 10,
  displayCount: 5,
  sorting: "time",
  convertTimeToMinutes: true,
  showLastUpdatedAlways: true,
  showRecentlyPassed: false,
  types: ["METRO", "BUS", "TRAIN", "TRAM", "SHIP"],
};

//Transport type options shown as checkboxes in the settings page
const TRANSPORT_TYPES = [
  { value: "METRO", label: "Metro" },
  { value: "BUS", label: "Bus" },
  { value: "TRAIN", label: "Train" },
  { value: "TRAM", label: "Tram" },
  { value: "SHIP", label: "Ship" },
];

//Converts both old and new saved formats into one shared stop format.
const normaliseStop = (item) => {
  if (item?.siteId) return item;
  if (item?.from?.siteId) return item.from;
  return null;
};

export default function SLSettings() {
  //The stop currently being typed/selected in the search input
  const [stop, setStop] = useState({ name: "", siteId: "" });

  //Search suggestions shown below the stop input
  const [suggestions, setSuggestions] = useState([]);

  //Full list of SL sites fetched from the SL API
  const [allSites, setAllSites] = useState([]);

  //Stops already saved by the user
  const [stops, setStops] = useState([]);

  //Display/filter settings for the SL widget
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  //Used to disable the add button while saving
  const [loading, setLoading] = useState(false);

  //Used to briefly show a success state after saving a stop
  const [saved, setSaved] = useState(false);

  //Reference to the stop search area, used to detect clicks outside the dropdown
  const stopRef = useRef(null);

  //Runs once when the settings page loads
  //Fetches SL stops, loads saved user config, and sets up click-outside behavior
  useEffect(() => {
    //Loads all available SL sites so the user can search by stop name
    const fetchSites = async () => {
      const res = await fetch("https://transport.integration.sl.se/v1/sites?expand=true");
      const data = await res.json();
      setAllSites(data);
    };

    //Loads saved stops and settings from Firebase for the logged-in user
    const loadSaved = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data() ?? {};

      //Prefer new slStops. Fall back to old slRoutes so existing users do not lose config
      setStops((data.slStops ?? data.slRoutes ?? []).map(normaliseStop).filter(Boolean));

      //Merge Firebase settings with defaults so missing fields still get safe values
      setSettings({ ...DEFAULT_SETTINGS, ...(data.slSettings ?? {}) });
    };

    fetchSites();
    loadSaved();

    //Closes the suggestions dropdown when the user clicks outside the search field
    const handleClickOutside = (e) => {
      if (stopRef.current && !stopRef.current.contains(e.target)) setSuggestions([]);
    };

    document.addEventListener("mousedown", handleClickOutside);

    //Clean up the event listener when the component unmounts
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  //Filters the full SL site list based on what the user types
  const search = (query) => {
    //Require at least 2 characters so the dropdown does not show too many results
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    //Show the first 8 matching stops
    setSuggestions(
      allSites
        .filter((site) => site.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    );
  };

  //Saves both selected stops and widget settings to Firebase
  const saveConfig = async (updatedStops = stops, updatedSettings = settings) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setDoc(
      doc(db, "users", uid),
      {
        //New shape for this project: chosen departure stops + widget settings
        slStops: updatedStops,
        slSettings: updatedSettings,

        // SERVER-SIDE CHANGE POINT:
        // If you later move SL calls to a backend, this user config is what the backend needs:
        // selected siteId(s), timewindow, displayCount, sorting, transport types, etc.
        // Example backend input: { siteIds: ["9001"], timewindow: 10, types: ["METRO"] }.
      },
      { merge: true }
    );
  };

  //Adds the currently selected stop to the user's saved stop list
  const addStop = async () => {
    //Do nothing if the user has typed text but not selected a valid stop suggestion
    if (!stop.siteId) return;

    //Prevent adding the same stop more than once
    if (stops.some((savedStop) => savedStop.siteId === stop.siteId)) {
      alert("Stop is already added.");
      return;
    }

    setLoading(true);

    try {
      //Create the updated stop list
      const updated = [...stops, { name: stop.name, siteId: stop.siteId }];

      //Save to Firebase first
      await saveConfig(updated, settings);

      //Then update local UI state
      setStops(updated);
      setStop({ name: "", siteId: "" });
      setSuggestions([]);

      //Show a short success message on the button
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  //Removes a saved stop by siteId
  const deleteStop = async (siteId) => {
    const updated = stops.filter((savedStop) => savedStop.siteId !== siteId);
    await saveConfig(updated, settings);
    setStops(updated);
  };

  //Updates one or more settings and saves the result to Firebase
  const updateSettings = async (patch) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await saveConfig(stops, updated);
  };

  //Turns a transport type on or off in the settings
  const toggleType = async (type) => {
    const current = new Set(settings.types);

    if (current.has(type)) current.delete(type);
    else current.add(type);

    await updateSettings({ types: Array.from(current) });
  };

  return (
    <div>
      {/* Page title and description */}
      <div className="page-header">
        <h1>SL Departures</h1>
        <p>Choose one or more stops. The widget will show departure times from those stops.</p>
      </div>

      {/* Card for searching and adding a new SL stop */}
      <div className="settings-card">
        <h2>Add stop</h2>

        <label>Stop</label>

        {/* Wrapper is used by stopRef to detect clicks outside the dropdown */}
        <div ref={stopRef} style={{ position: "relative", marginBottom: 16 }}>
          <input
            className="settings-input"
            placeholder="Search stop, for example T-Centralen..."
            value={stop.name}
            onChange={(e) => {
              //Reset siteId while typing, because typed text is not a confirmed SL stop yet
              setStop({ name: e.target.value, siteId: "" });

              //Update search suggestions based on the typed value.
              search(e.target.value);
            }}
          />

          {/* Dropdown with matching SL stops */}
          {suggestions.length > 0 && (
            <div className="dropdown">
              {suggestions.map((site) => (
                <div
                  key={site.id}
                  className="dropdown-item"
                  onClick={() => {
                    // Store both the readable stop name and the SL siteId
                    setStop({ name: site.name, siteId: site.id });

                    // Hide dropdown after selecting a stop
                    setSuggestions([]);
                  }}
                >
                  {site.name} <span style={{ color: "#6b7280" }}>#{site.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add button is disabled until a valid stop has been selected */}
        <button className="btn-primary" onClick={addStop} disabled={loading || !stop.siteId}>
          {loading ? "Saving..." : saved ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiCheck size={14} /> Added!</span> : "+ Add stop"}
        </button>
      </div>

      {/* Card for controlling how the widget displays departures */}
      <div className="settings-card">
        <h2>Display options</h2>

        {/* How many minutes into the future departures should be fetched */}
        <label>Time window in minutes</label>
        <input
          className="settings-input"
          type="number"
          min="1"
          max="60"
          value={settings.timewindow}
          onChange={(e) => updateSettings({ timewindow: Number(e.target.value) })}
        />

        {/* Maximum number of departures shown for each saved stop */}
        <label>Max departures per stop</label>
        <input
          className="settings-input"
          type="number"
          min="1"
          max="20"
          value={settings.displayCount}
          onChange={(e) => updateSettings({ displayCount: Number(e.target.value) })}
        />

        {/* Sorting mode for the departure list */}
        <label>Sorting</label>
        <select
          className="settings-input"
          value={settings.sorting}
          onChange={(e) => updateSettings({ sorting: e.target.value })}
        >
          <option value="time">Chronological</option>
          <option value="directionTime">Direction, then time</option>
        </select>

        {/* Transport type filters */}
        <label style={{ marginTop: 12 }}>Transport types</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {TRANSPORT_TYPES.map((type) => (
            <label key={type.value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={settings.types.includes(type.value)}
                onChange={() => toggleType(type.value)}
              />
              {type.label}
            </label>
          ))}
        </div>

        {/* Controls whether departures show as "5 min" or as clock times like "14:32" */}
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.convertTimeToMinutes}
            onChange={(e) => updateSettings({ convertTimeToMinutes: e.target.checked })}
          />
          Show times as minutes left
        </label>

        {/* Controls whether the widget shows the last successful update time */}
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.showLastUpdatedAlways}
            onChange={(e) => updateSettings({ showLastUpdatedAlways: e.target.checked })}
          />
          Show last updated time
        </label>

        {/* Controls whether just-passed departures should still be visible */}
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.showRecentlyPassed}
            onChange={(e) => updateSettings({ showRecentlyPassed: e.target.checked })}
          />
          Show recently passed departures
        </label>
      </div>

      {/* Saved stop list. Only shown if the user has added at least one stop */}
      {stops.length > 0 && (
        <div className="settings-card">
          <h2>Saved stops</h2>

          {stops.map((savedStop) => (
            <div key={savedStop.siteId} className="route-card">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Green dot showing the stop is active/saved */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#16a34a",
                      flexShrink: 0,
                    }}
                  />

                  {/* Stop name and SL siteId */}
                  <span style={{ fontSize: 14, color: "#111827" }}>
                    {savedStop.name} <span style={{ color: "#6b7280" }}>#{savedStop.siteId}</span>
                  </span>
                </div>
              </div>

              {/* Removes this stop from Firebase and local state */}
              <button className="btn-danger" onClick={() => deleteStop(savedStop.siteId)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
