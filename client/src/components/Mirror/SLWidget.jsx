import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FiMapPin } from "react-icons/fi";
import { FaSubway, FaTram, FaBus, FaShip, FaTrain } from "react-icons/fa";

//How often we make a real API request to SL
const REFRESH_INTERVAL = 60000;

//This does not call SL again, it only re-renders the current data
const COUNTDOWN_INTERVAL = 60000;

//Default widget settings these are used if the user has not saved custom SL settings in Firebase.
const DEFAULT_SETTINGS = {
  timewindow: 10,
  displayCount: 5,
  sorting: "time", // "time" or "directionTime" how we want to sort information,
  convertTimeToMinutes: true,
  showLastUpdatedAlways: true,
  showRecentlyPassed: false,
  types: ["METRO", "BUS", "TRAIN", "TRAM", "SHIP"],
};

const TRANSPORT_ICONS = {
  METRO: FaSubway,
  TRAM: FaTram,
  BUS: FaBus,
  SHIP: FaShip,
  TRAIN: FaTrain,
};

// Makes old and new saved stop formats work together.
const normaliseStop = (item) => {
  if (item?.siteId) return item;
  if (item?.from?.siteId) return item.from;
  return null;
};


//Safely converts a value into a JavaScript Date, returns null if the value is missing or invalid
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

//Calculates how many minutes are left until a departure
const minutesUntil = (dateValue) => {
  const date = toDate(dateValue);
  if (!date) return null;
  return Math.round((date.getTime() - Date.now()) / 60000);
};

//Decides what text should be shown for a departure time
//Example: "5 min", "Now", "Just passed", or "14:32"
const formatDepartureTime = (dep, convertTimeToMinutes) => {
  const departureTime = dep.expected ?? dep.scheduled;
  const minutes = minutesUntil(departureTime);

  if (convertTimeToMinutes && minutes !== null) {
    if (minutes <= -1) return "Just passed";
    if (minutes === 0) return "Now";
    return `${minutes} min`;
  }

  const date = toDate(departureTime);
  return date ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-";
};

//Reads the journey direction from the SL response
const getJourneyDirection = (dep) => {
  return dep.direction_code ?? dep.directionCode ?? dep.journey?.direction ?? dep.direction ?? "";
};

//Fetches departures from SL for one selected stop
const fetchDepartures = async (siteId, timewindow) => {
  const params = new URLSearchParams();

  //The forecast parameter controls how many minutes ahead SL should return departures for
  if (timewindow) params.set("forecast", String(timewindow));

  const res = await fetch(
    `https://transport.integration.sl.se/v1/sites/${siteId}/departures?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(`Could not fetch departures for site ${siteId} (${res.status})`);
  }

  const data = await res.json();
  return data.departures ?? [];
};

export default function SLWidget() {
  const rootRef = useRef(null);

  //Stops chosen by the user in settings
  const [stops, setStops] = useState([]);

  //Settings loaded from Firebase, merged with DEFAULT_SETTINGS
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  //Stores departures grouped by stop siteId
  const [departuresByStop, setDeparturesByStop] = useState({});

  //Controls loading and error messages in the UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //Stores when the widget last successfully fetched data
  const [lastUpdated, setLastUpdated] = useState(null);
  const [layoutMode, setLayoutMode] = useState("vertical");

  //References to interval timers, so they can be cleared when the component unmounts
  const refreshTimer = useRef(null);
  const countdownTimer = useRef(null);

  //Decide layout based on widget shape.
  //Horizontal widgets show stop cards side by side, vertical widgets stack cards.
  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const updateLayoutMode = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      setLayoutMode(width >= height ? "horizontal" : "vertical");
    };

    updateLayoutMode();

    const observer = new ResizeObserver(updateLayoutMode);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  //Loads the user's saved stops and SL settings from Firebase when the widget first mounts
  useEffect(() => {
    const loadSavedStops = async () => {
      const uid = auth.currentUser?.uid;

      //If no user is logged in, stop loading and show the empty-state message
      if (!uid) {
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data() ?? {};

      // Prefer the new chosen-stop setup, but old routes still work
      const savedStops = (data.slStops ?? data.slRoutes ?? [])
        .map(normaliseStop)
        .filter(Boolean);

      setStops(savedStops);

      //Merge saved user settings with defaults
      //Saved settings override default values
      setSettings({ ...DEFAULT_SETTINGS, ...(data.slSettings ?? {}) });

      setLoading(false);
    };

    loadSavedStops();
  }, []);

  //Filters, formats, and sorts departures before displaying them
  const filteredAndSortedDepartures = useCallback(
    (departures) => {
      const allowedTypes = new Set(settings.types ?? DEFAULT_SETTINGS.types);
      const showRecentlyPassed = Boolean(settings.showRecentlyPassed);
      const displayCount = Number(settings.displayCount ?? DEFAULT_SETTINGS.displayCount);

      const filtered = departures
        //Only keep transport types enabled in settings
        .filter((dep) => allowedTypes.has(dep.line?.transport_mode))

        //Add display-friendly fields to each departure
        .map((dep) => ({
          ...dep,
          displayTime: formatDepartureTime(dep, settings.convertTimeToMinutes),
          minutesLeft: minutesUntil(dep.expected ?? dep.scheduled),
          journeyDirection: getJourneyDirection(dep),
        }))

        //Hide departures that recently passed, unless enabled in settings
        .filter((dep) => showRecentlyPassed || dep.displayTime !== "Just passed")

        //Hide negative minute values, unless recently passed departures should be shown
        .filter((dep) => dep.minutesLeft === null || dep.minutesLeft >= 0 || showRecentlyPassed);

      //Sort departures either only by time or by direction first, then time
      filtered.sort((a, b) => {
        if (settings.sorting === "directionTime") {
          const dirCompare = String(a.journeyDirection).localeCompare(String(b.journeyDirection));
          if (dirCompare !== 0) return dirCompare;
        }

        return (a.minutesLeft ?? Number.MAX_SAFE_INTEGER) - (b.minutesLeft ?? Number.MAX_SAFE_INTEGER);
      });

      //Limit how many departures are shown per stop
      return displayCount > 0 ? filtered.slice(0, displayCount) : filtered;
    },
    [settings]
  );

  //Fetches fresh departures for all selected stops
  const refresh = useCallback(async () => {
    if (stops.length === 0) return;

    setError(null);

    try {
      const results = {};

      //Fetch all selected stops in parallel
      await Promise.all(
        stops.map(async (stop) => {
          const departures = await fetchDepartures(stop.siteId, settings.timewindow);
          results[stop.siteId] = departures;
        })
      );

      setDeparturesByStop(results);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [settings.timewindow, stops]);

  //Starts the real SL API refresh interval
  //Also runs one refresh immediately when stops are available
  useEffect(() => {
    if (stops.length === 0) return undefined;

    refresh();
    refreshTimer.current = setInterval(refresh, REFRESH_INTERVAL);

    //Clear the interval when the component unmounts or dependencies change
    return () => clearInterval(refreshTimer.current);
  }, [refresh, stops.length]);

  //Starts a lightweight countdown interval
  //This forces the UI to recalculate "5 min" -> "4 min" without calling SL again
  useEffect(() => {
    countdownTimer.current = setInterval(() => {
      setDeparturesByStop((current) => ({ ...current }));
    }, COUNTDOWN_INTERVAL);

    return () => clearInterval(countdownTimer.current);
  }, []);

  //Builds the data used by the UI
  //useMemo avoids recalculating stop cards unless stops, departures, or filters change
  const stopCards = useMemo(
    () =>
      stops.map((stop) => ({
        stop,
        departures: filteredAndSortedDepartures(departuresByStop[stop.siteId] ?? []),
      })),
    [departuresByStop, filteredAndSortedDepartures, stops]
  );

  //Loading state shown while Firebase or SL data is being loaded
  if (loading) return <div ref={rootRef} className={`sl-widget sl-widget--${layoutMode} dimmed`}>Loading SL departures...</div>;

  //Empty state shown when the user has not selected any stops
  if (stops.length === 0) {
    return <div ref={rootRef} className={`sl-widget sl-widget--${layoutMode} dimmed`}>Choose an SL stop in settings to show departures.</div>;
  }

  return (
    <div ref={rootRef} className={`sl-widget sl-widget--${layoutMode}`}>
      {/* Shows either the latest update time or an SL error message */}
      {(settings.showLastUpdatedAlways || error) && (
        <div className="sl-last-updated">
          {error ? `SL error: ${error}` : `Last updated: ${lastUpdated?.toLocaleTimeString("en-US")}`}
        </div>
      )}

      {/* One card/table per selected stop */}
      {stopCards.map(({ stop, departures }) => (
        <section key={stop.siteId} className="sl-stop-card">
          {/* Stop name, for example "T-Centralen" */}
          <h3 className="sl-stop-title">{stop.name}</h3>

          {/* Show an empty message if no departures match the selected filters */}
          {departures.length === 0 ? (
            <p className="sl-empty">No departures found for the selected filters.</p>
          ) : (
            <table className="sl-departure-table">
              <tbody>
                {/* One table row per departure. */}
                {departures.map((dep, index) => (
                  <tr key={`${dep.line?.designation}-${dep.destination}-${dep.scheduled}-${index}`}>
                    {/* Transport icon, for example metro/bus/train */}
                    <td className="sl-icon">
                      {(() => {
                        const Icon = TRANSPORT_ICONS[dep.line?.transport_mode];
                        return Icon ? <Icon size={12} /> : <FiMapPin size={12} />;
                      })()}
                    </td>

                    {/* Line number, for example 14, 4, or  pendeltåg line */}
                    <td className="sl-line">{dep.line?.designation}</td>

                    {/* Destination/end station */}
                    <td className="sl-destination">{dep.destination}</td>

                    {/* Formatted departure time */}
                    <td className="sl-time">{dep.displayTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
