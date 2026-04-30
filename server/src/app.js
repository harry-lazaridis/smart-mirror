import express from "express";
import cors from "cors";

import googleRoutes from "./routes/google.routes.js";
import weatherRoutes from "./routes/weather.routes.js"

const app = express();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: clientUrl,
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", googleRoutes);
app.use("/api/util", weatherRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
