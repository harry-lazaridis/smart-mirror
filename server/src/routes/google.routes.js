import express from "express";
import oauth2Client from "../google.js";
import { google } from "googleapis"
import { authMiddleware } from "../middleware/auth.js";
import admin, {db} from "../config/firebase.js";

const router = express.Router();

const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : queryToken;

  if (!token) throw new Error("No token provided");

  return await admin.auth().verifyIdToken(token);
};

router.get("/google/test", authMiddleware, (req, res) => {
    const uid = req.user.uid;
    const name = req.user.displayName;

    res.json({data: req.user.name});
})

router.get("/google", async (req, res) => {
  try {
    const decoded = await verifyToken(req);

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.readonly"],
      state: decoded.uid,
    });

    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(401).send("Unauthorized");
  }
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const uid = state;

    await db.collection("users").doc(uid).set(
      { googleTokens: tokens },
      { merge: true }
    );

    // Redirect back to your frontend after success
    res.redirect("http://localhost:5173/admin?calendar=connected");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});


router.get("/google/calendar", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const tokens = userDoc.data()?.googleTokens;

    if (!tokens) {
      return res.status(400).json({ error: "Google not connected" });
    }

    oauth2Client.setCredentials(tokens);

    // Auto-save refreshed tokens if they rotate
    oauth2Client.on("tokens", async (newTokens) => {
      await db.collection("users").doc(uid).set(
        { googleTokens: { ...tokens, ...newTokens } },
        { merge: true }
      );
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json(response.data.items);
  } catch (err) {
    console.error("CALENDAR ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;