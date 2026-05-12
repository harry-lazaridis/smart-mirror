import express from "express";
import { google } from "googleapis";
import admin, { db } from "../config/firebase.js";
import { createOAuth2Client } from "../google.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : queryToken;

  if (!token) throw new Error("No token provided");
  return admin.auth().verifyIdToken(token);
};

router.get("/google/test", authMiddleware, (req, res) => {
  res.json({
    uid: req.user?.uid || null,
    name: req.user?.name || req.user?.displayName || null,
  });
});

router.get("/google", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const oauth2Client = createOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks.readonly",
      ],
      state: decoded.uid,
    });
    res.redirect(url);
  } catch (err) {
    console.error("GOOGLE AUTH URL ERROR:", err?.message || err);
    res.status(401).send("Unauthorized");
  }
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    const uid = state;

    await db.collection("users").doc(uid).set(
      { googleTokens: tokens, connectedToCalendar: true },
      { merge: true }
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/admin?calendar=connected`);
  } catch (err) {
    console.error("GOOGLE CALLBACK ERROR:", err?.message || err);
    res.status(500).send("OAuth failed");
  }
});

router.post("/google/disconnect", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const uid = decoded.uid;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const tokens = userDoc.data()?.googleTokens;

    if (tokens?.access_token || tokens?.refresh_token) {
      try {
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials(tokens);
        if (tokens.access_token) await oauth2Client.revokeToken(tokens.access_token);
        else if (tokens.refresh_token) await oauth2Client.revokeToken(tokens.refresh_token);
      } catch (revokeErr) {
        console.error("GOOGLE REVOKE WARNING:", revokeErr?.message || revokeErr);
      }
    }

    await userRef.set(
      {
        googleTokens: null,
        connectedToCalendar: false,
        googleReconnectRequired: false,
        googleCalendarEvents: [],
        googleCalendarEventsUpdatedAt: null,
      },
      { merge: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("GOOGLE DISCONNECT ERROR:", err?.message || err);
    res.status(500).json({ error: "Failed to disconnect Google Calendar" });
  }
});

router.get("/google/calendar", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const tokens = userDoc.data()?.googleTokens;
    if (!tokens) return res.status(400).json({ error: "Google not connected" });

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });
    const items = response.data.items || [];

    const freshCredentials = oauth2Client.credentials || {};
    const hasTokenUpdates =
      Object.keys(freshCredentials).length > 0 &&
      JSON.stringify(freshCredentials) !== JSON.stringify(tokens);

    const mergePayload = {
      googleCalendarEvents: items,
      googleCalendarEventsUpdatedAt: new Date().toISOString(),
    };
    if (hasTokenUpdates) mergePayload.googleTokens = { ...tokens, ...freshCredentials };

    await db.collection("users").doc(uid).set(mergePayload, { merge: true });
    res.json(items);
  } catch (err) {
    const errorData = err?.response?.data;
    const isInvalidGrant =
      err?.message === "invalid_grant" || errorData?.error === "invalid_grant";

    if (isInvalidGrant) {
      try {
        const decoded = await verifyToken(req);
        await db.collection("users").doc(decoded.uid).set(
          {
            googleTokens: null,
            connectedToCalendar: false,
            googleReconnectRequired: true,
          },
          { merge: true }
        );
      } catch (cleanupError) {
        console.error("CALENDAR TOKEN CLEANUP ERROR:", cleanupError?.message || cleanupError);
      }

      return res.status(401).json({
        error: "Google token expired or revoked. Please reconnect your Google Calendar.",
        code: "GOOGLE_RECONNECT_REQUIRED",
      });
    }

    console.error("CALENDAR ERROR:", err?.message || err);
    res.status(500).json({ error: "Failed to load calendar events" });
  }
});

router.get("/google/tasks", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const tokens = userDoc.data()?.googleTokens;
    if (!tokens) return res.status(400).json({ error: "Google not connected" });

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });

    const taskListsResponse = await tasksApi.tasklists.list({ maxResults: 20 });
    const taskLists = taskListsResponse.data.items || [];

    const allTasks = [];
    for (const taskList of taskLists) {
      const tasksResponse = await tasksApi.tasks.list({
        tasklist: taskList.id,
        showCompleted: true,
        showHidden: false,
        maxResults: 100,
      });

      const tasks = tasksResponse.data.items || [];
      tasks.forEach((task) => {
        allTasks.push({
          id: task.id,
          googleTaskId: task.id,
          taskListId: taskList.id,
          taskListTitle: taskList.title,
          text: task.title || "Untitled task",
          notes: task.notes || "",
          done: task.status === "completed",
          due: task.due || null,
          createdAt: task.updated ? new Date(task.updated).getTime() : Date.now(),
          source: "googleTasks",
        });
      });
    }

    await db.collection("users").doc(uid).set(
      { todos: allTasks, connectedToTasks: true },
      { merge: true }
    );

    const freshCredentials = oauth2Client.credentials || {};
    const hasTokenUpdates =
      Object.keys(freshCredentials).length > 0 &&
      JSON.stringify(freshCredentials) !== JSON.stringify(tokens);
    if (hasTokenUpdates) {
      await db.collection("users").doc(uid).set(
        { googleTokens: { ...tokens, ...freshCredentials } },
        { merge: true }
      );
    }

    res.json(allTasks);
  } catch (err) {
    console.error("TASKS ERROR FULL:", {
      message: err?.message,
      code: err?.code,
      status: err?.response?.status,
      data: err?.response?.data,
    });
    res.status(500).json({
      error: "Failed to load Google Tasks",
      details: err?.response?.data || err?.message,
    });
  }
});

export default router;
