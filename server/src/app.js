import express from "express";
import cors from "cors";

import googleRoutes from "./routes/google.routes.js";
import weatherRoutes from "./routes/weather.routes.js"
import fileRoutes from "./routes/file.routes.js"

const app = express();
const defaultOrigins = ["http://localhost:5173"];
const envOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl, health checks) with no Origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", googleRoutes);
app.use("/api/util", weatherRoutes);
app.use("/api/calendar", fileRoutes);
// /api/calendar/events
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
