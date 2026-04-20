import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const REFRESH_INTERVAL = 60000;

const fetchDepartures = async (siteId) => {
  const res = await fetch(`https://transport.integration.sl.se/v1/sites/${siteId}/departures`);
  const data = await res.json();
  return data.departures ?? [];
};

export default function SLWidget() {
  const [routes, setRoutes]         = useState([]);
  const [departures, setDepartures] = useState({}); 
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const load = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      const savedRoutes = snap.data()?.slRoutes ?? [];
      setRoutes(savedRoutes);
    };
    load();
  }, []);

  const refresh = async () => {
    if (routes.length === 0) return;
    try {
      const results = {};
      await Promise.all(
        routes.map(async (route) => {
          results[route.id] = await fetchDepartures(route.from.siteId);
        })
      );
      setDepartures(results);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routes.length === 0) return;
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [routes]);

  /** 
    dep.line.designation      // "17", "tunnelbana" etc
    dep.line.transport_mode   // "BUS" | "METRO" | "TRAM" | "TRAIN"
    dep.destination           // "Skärholmen"
    dep.scheduled             // "2026-04-20T10:32:00"
    dep.expected              // "2026-04-20T10:34:00" (null om ingen realtid)
    dep.stop_point.designation // "A", "B" (perrongen)
    dep.state                 // "NOTEXPECTED" | "EXPECTED" | "DEPARTED"
   */

    //{ routes, departures, loading, error, lastUpdated, refresh }

    //https://www.trafiklab.se/api/our-apis/sl/transport/ kräver ingen nyckel. Men hämtar ALL alltså ALL data.
    
    return (
    <div>
      <p>Senast updatering: {lastUpdated?.toLocaleTimeString("sv-SE")}</p>

      {routes.map(route => (
        <div key={route.id}>
          <h3>{route.from.name} → {route.to.name}</h3>
          {departures[route.id]?.slice(0, 3).map((dep, i) => (
            <div key={i}>
              <span>{dep.line?.designation}</span>
              <span>{dep.destination}</span>
              <span>{dep.expected ?? dep.scheduled}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
    )
}