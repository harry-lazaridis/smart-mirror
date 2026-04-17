import express from "express";
import cors from "cors";

import googleRoutes from "./routes/google.routes.js";
import weatherRoutes from "./routes/weather.routes.js"

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", googleRoutes);
app.use("/api/util", weatherRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
