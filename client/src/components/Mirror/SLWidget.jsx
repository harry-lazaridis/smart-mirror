import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FiMapPin } from "react-icons/fi";
import { FaSubway, FaTram, FaBus, FaShip, FaTrain } from "react-icons/fa";

//How often we make a real API request to SL
const REFRESH_INTERVAL = 60000;

//Default widget settings these are used if the user has not saved custom SL settings in Firebase.
const DEFAULT_SETTINGS = {
  timewindow: 10,
  displayCount: 5,
  sorting: "time",
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

const normaliseStop = (item) => {
  if (item?.siteId) return item;
  if (item?.from?.siteId) return item.from;
  return null;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const minutesUntil = (dateValue) => {
  const date = toDate(dateValue);
  if (!date) return null;
  return Math.round((date.getTime() - Date.now()) / 60000);
};

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

const getJourneyDirection = (dep) => {
  return dep.direction_code ?? dep.directionCode ?? dep.journey?.direction ?? dep.direction ?? "";
};

const fetchDepartures = async (siteId, timewindow) => {
  const params = new URLSearchParams();

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
  const refreshTimer = useRef(null);

  const [stops, setStops] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [departuresByStop, setDeparturesByStop] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [layoutMode, setLayoutMode] = useState("vertical");

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

  useEffect(() => {
    const loadSavedStops = async () => {
      const uid = auth.currentUser?.uid;

      if (!uid) {
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data() ?? {};

      const savedStops = (data.slStops ?? data.slRoutes ?? [])
        .map(normaliseStop)
        .filter(Boolean);

      setStops(savedStops);
      setSettings({ ...DEFAULT_SETTINGS, ...(data.slSettings ?? {}) });
      setLoading(false);
    };

    loadSavedStops();
  }, []);

  const filteredAndSortedDepartures = useCallback(
    (departures) => {
      const allowedTypes = new Set(settings.types ?? DEFAULT_SETTINGS.types);
      const showRecentlyPassed = Boolean(settings.showRecentlyPassed);
      const displayCount = Number(settings.displayCount ?? DEFAULT_SETTINGS.displayCount);

      const filtered = departures
        .filter((dep) => allowedTypes.has(dep.line?.transport_mode))
        .map((dep) => ({
          ...dep,
          displayTime: formatDepartureTime(dep, settings.convertTimeToMinutes),
          minutesLeft: minutesUntil(dep.expected ?? dep.scheduled),
          journeyDirection: getJourneyDirection(dep),
        }))
        .filter((dep) => showRecentlyPassed || dep.displayTime !== "Just passed")
        .filter((dep) => dep.minutesLeft === null || dep.minutesLeft >= 0 || showRecentlyPassed);

      filtered.sort((a, b) => {
        if (settings.sorting === "directionTime") {
          const dirCompare = String(a.journeyDirection).localeCompare(String(b.journeyDirection));
          if (dirCompare !== 0) return dirCompare;
        }

        return (a.minutesLeft ?? Number.MAX_SAFE_INTEGER) - (b.minutesLeft ?? Number.MAX_SAFE_INTEGER);
      });

      return displayCount > 0 ? filtered.slice(0, displayCount) : filtered;
    },
    [settings]
  );

  const refresh = useCallback(async () => {
    if (stops.length === 0) return;

    setError(null);

    try {
      const results = {};

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

  useEffect(() => {
    if (stops.length === 0) return undefined;

    refresh();

    refreshTimer.current = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(refreshTimer.current);
    };
  }, [refresh, stops.length]);

  const stopCards = useMemo(
    () =>
      stops.map((stop) => ({
        stop,
        departures: filteredAndSortedDepartures(departuresByStop[stop.siteId] ?? []),
      })),
    [departuresByStop, filteredAndSortedDepartures, stops]
  );

  if (loading) {
    return <div ref={rootRef} className={`sl-widget sl-widget--${layoutMode} dimmed`}>Loading SL departures...</div>;
  }

  if (stops.length === 0) {
    return <div ref={rootRef} className={`sl-widget sl-widget--${layoutMode} dimmed`}>Choose an SL stop in settings to show departures.</div>;
  }

  return (
    <div ref={rootRef} className={`sl-widget sl-widget--${layoutMode}`}>
      {stopCards.map(({ stop, departures }, index) => (
        <section key={stop.siteId} className="sl-stop-card">
          {index === 0 && (settings.showLastUpdatedAlways || error) && (
            <div className="sl-last-updated">
              {error
                ? `SL error: ${error}`
                : `Last updated: ${lastUpdated?.toLocaleTimeString("en-US")}`}
            </div>
          )}

          <h3 className="sl-stop-title">{stop.name}</h3>

          {departures.length === 0 ? (
            <p className="sl-empty">No departures found for the selected filters.</p>
          ) : (
            <table className="sl-departure-table">
              <tbody>
                {departures.map((dep, index) => (
                  <tr key={`${dep.line?.designation}-${dep.destination}-${dep.scheduled}-${index}`}>
                    <td className="sl-icon">
                      {(() => {
                        const Icon = TRANSPORT_ICONS[dep.line?.transport_mode];
                        return Icon ? <Icon size={12} /> : <FiMapPin size={12} />;
                      })()}
                    </td>

                    <td className="sl-line">{dep.line?.designation}</td>
                    <td className="sl-destination">{dep.destination}</td>
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