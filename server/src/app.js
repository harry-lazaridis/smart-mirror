import express from "express";
import cors from "cors";

import googleRoutes from "./routes/google.routes.js";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/auth", googleRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
